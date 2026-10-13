//! M2's "Done when" (ARCHITECTURE.md §12): the running example's day from `scripts/arch/money-flow.mjs`, its steps 1
//! to 11 (from the start to the 4:00 PM sweep), in LiteSVM. After each step the backend's repeatable check (D97) sends
//! Return to owner for every balance left in the book, from its own key, so each wallet then holds exactly what
//! money-flow.mjs says its owner owns. Every wallet's USDC, Yes and No, the vault, the owed counter, both supplies, the
//! resting orders and the book's three token accounts are checked after every step, and each transaction's events are
//! read back in order (D62).
//!
//! The bot quotes with Replace quotes (D111), as the backend's bot will: at 9:30 it offers 5 Yes at 66¢ and bids for 5
//! at 64¢, and at 10:59 it moves its bid to 65¢, which re-places its offer too (money-flow.mjs leaves the offer
//! resting; with no other offer at 66¢, nothing on the book or in any wallet differs).
mod common;

use {
    anchor_lang::{event::EVENT_IX_TAG_LE, prelude::*, solana_program::instruction::Instruction, AnchorDeserialize, Discriminator},
    common::{config_for, pda, token_account, Chain, Trader, AT_8_30, AT_9_00, TOKEN, TOKEN_2022},
    litesvm::LiteSVM,
    meridian::{
        events::{BalanceReturned, Fill, OrderCancelled, OrderPlaced, PairsMinted, Redeemed},
        Book, BuyNoArgs, OrderKind, PlaceOrderArgs, Quote, RedeemMode, Side, BOOK_NO_SEED, BOOK_SEED, BOOK_USDC_SEED,
        BOOK_YES_SEED, NO_SEED, VAULT_SEED, YES_SEED,
    },
    solana_account::Account,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
    std::collections::BTreeMap,
};

/// USDC's smallest units in `cents`.
fn usdc(cents: u64) -> u64 {
    cents * 10_000
}

const PEOPLE: [&str; 5] = ["Alice", "Bob", "Carol", "Dave", "bot"];

/// What money-flow.mjs states after a step: each person's USDC (in cents), Yes and No, in PEOPLE's order; the vault
/// (cents); the pairs outstanding, which are the owed counter and both supplies; and what the book's resting orders
/// lock, USDC (cents) and Yes.
struct Expected {
    wallets: [(u64, u64, u64); 5],
    vault: u64,
    pairs: u64,
    locked: (u64, u64),
}

struct Day {
    svm: LiteSVM,
    c: Chain,
    market: Pubkey,
    operator: Keypair,
    /// The backend's own key, which sends Return to owner (anyone may, D99).
    backend: Keypair,
    people: BTreeMap<String, (Keypair, Trader)>,
    next_order_id: u64,
}

impl Day {
    fn new() -> Day {
        let mut c = Chain::new(false);
        let operator = Keypair::new();
        c.operator = operator.pubkey();
        let config = config_for(&c.m, c.usdc_mint, operator.pubkey(), c.admin, 32, false);
        c.set(c.config, config);
        let mut svm = LiteSVM::new();
        svm.add_program(meridian::ID, include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/meridian.so"))).unwrap();
        svm.add_program(TOKEN, include_bytes!("fixtures/spl_token.so")).unwrap();
        svm.add_program(TOKEN_2022, include_bytes!("fixtures/spl_token_2022.so")).unwrap();
        for (key, account) in &c.accounts {
            if !account.executable && account.lamports > 0 {
                svm.set_account(*key, account.clone()).unwrap();
            }
        }
        let backend = Keypair::new();
        for key in [operator.pubkey(), backend.pubkey()] {
            svm.set_account(key, Account { lamports: 10_000_000_000, ..Account::default() }).unwrap();
        }
        let market = common::market_pda(&common::meta_680()).0;
        let mut people = BTreeMap::new();
        for name in PEOPLE {
            let keypair = Keypair::new();
            let t = Trader { owner: keypair.pubkey(), usdc: Pubkey::new_unique(), yes: Pubkey::new_unique(), no: Pubkey::new_unique() };
            svm.set_account(t.owner, Account { lamports: 1_000_000_000, ..Account::default() }).unwrap();
            svm.set_account(t.usdc, token_account(&c.m, TOKEN, c.usdc_mint, t.owner, usdc(2000))).unwrap();
            svm.set_account(t.yes, token_account(&c.m, TOKEN_2022, pda(YES_SEED, &market), t.owner, 0)).unwrap();
            svm.set_account(t.no, token_account(&c.m, TOKEN_2022, pda(NO_SEED, &market), t.owner, 0)).unwrap();
            people.insert(name.to_string(), (keypair, t));
        }
        let mut day = Day { svm, c, market, operator, backend, people, next_order_id: 0 };
        day.set_clock(AT_8_30);
        let ix = day.c.create_market_ix(day.operator.pubkey(), &common::meta_680());
        let operator = day.operator.insecure_clone();
        day.send(ix, &operator);
        day
    }

    fn set_clock(&mut self, unix_timestamp: i64) {
        let mut clock: Clock = self.svm.get_sysvar();
        clock.unix_timestamp = unix_timestamp;
        self.svm.set_sysvar(&clock);
    }

    /// The running example's day, by its New York time: "11:00", or "16:00" for 4:00 PM.
    fn at(&mut self, hh_mm: &str) {
        let (h, m) = hh_mm.split_once(':').unwrap();
        let minutes_after_9 = (h.parse::<i64>().unwrap() - 9) * 60 + m.parse::<i64>().unwrap();
        self.set_clock(AT_9_00 + minutes_after_9 * 60);
    }

    /// Sends one instruction and returns its events, described in order.
    fn send(&mut self, ix: Instruction, signer: &Keypair) -> Vec<String> {
        let msg = Message::new_with_blockhash(&[ix], Some(&signer.pubkey()), &self.svm.latest_blockhash());
        let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg.clone()), &[signer]).unwrap();
        let meta = self.svm.send_transaction(tx).unwrap_or_else(|e| panic!("{:?}\n{}", e.err, e.meta.logs.join("\n")));
        self.svm.expire_blockhash();
        meta.inner_instructions
            .iter()
            .flatten()
            .filter(|i| msg.account_keys[i.instruction.program_id_index as usize] == meridian::ID)
            .map(|i| self.describe(&i.instruction.data))
            .collect()
    }

    fn who(&self, key: &Pubkey) -> String {
        self.people.iter().find(|(_, (k, _))| k.pubkey() == *key).map(|(n, _)| n.clone()).unwrap_or_else(|| key.to_string())
    }

    fn describe(&self, data: &[u8]) -> String {
        assert_eq!(&data[..8], EVENT_IX_TAG_LE, "an event call starts with Anchor's tag");
        let (discriminator, mut fields) = (&data[8..16], &data[16..]);
        if discriminator == PairsMinted::DISCRIMINATOR {
            let e = PairsMinted::deserialize(&mut fields).unwrap();
            format!("{} minted {}", self.who(&e.owner), e.quantity)
        } else if discriminator == Fill::DISCRIMINATOR {
            let e = Fill::deserialize(&mut fields).unwrap();
            let (verb, preposition) = if e.side == Side::Buy { ("bought", "from") } else { ("sold", "to") };
            format!("{} {verb} {} Yes at {}¢ {preposition} {}", self.who(&e.taker), e.quantity, e.price, self.who(&e.maker))
        } else if discriminator == Redeemed::DISCRIMINATOR {
            let e = Redeemed::deserialize(&mut fields).unwrap();
            format!("{} redeemed {:?}: {} for {}", self.who(&e.owner), e.mode, e.quantity, e.usdc)
        } else if discriminator == OrderPlaced::DISCRIMINATOR {
            let e = OrderPlaced::deserialize(&mut fields).unwrap();
            format!("{} placed {:?} {}x{}¢", self.who(&e.owner), e.side, e.quantity, e.price)
        } else if discriminator == OrderCancelled::DISCRIMINATOR {
            let e = OrderCancelled::deserialize(&mut fields).unwrap();
            format!("{} cancelled {:?} {}x{}¢ ({:?})", self.who(&e.owner), e.side, e.quantity, e.price, e.reason)
        } else if discriminator == BalanceReturned::DISCRIMINATOR {
            let e = BalanceReturned::deserialize(&mut fields).unwrap();
            format!("{} returned {} USDC, {} Yes, {} No", self.who(&e.owner), e.usdc, e.yes, e.no)
        } else {
            format!("another event: {discriminator:?}")
        }
    }

    fn keypair(&self, who: &str) -> Keypair {
        self.people[who].0.insecure_clone()
    }

    fn mint(&mut self, who: &str, quantity: u64) -> Vec<String> {
        let ix = self.c.mint_pairs_ix(&self.market, &self.people[who].1, quantity);
        let signer = self.keypair(who);
        self.send(ix, &signer)
    }

    fn order(&mut self, who: &str, side: Side, kind: OrderKind, price: u8, quantity: u32) -> Vec<String> {
        self.next_order_id += 1;
        let args = PlaceOrderArgs { side, kind, price, quantity, order_id: self.next_order_id };
        let ix = self.c.place_order_ix(&self.market, &self.people[who].1, args);
        let signer = self.keypair(who);
        self.send(ix, &signer)
    }

    /// The bot's batch on this one book; it reuses order IDs 1 and up, since its old orders are cancelled first.
    fn quotes(&mut self, who: &str, quotes: &[(Side, u8, u32)]) -> Vec<String> {
        let quotes = quotes.iter().enumerate().map(|(i, &(side, price, quantity))| Quote { side, price, quantity, order_id: i as u64 + 1 }).collect();
        let t = &self.people[who].1;
        let ix = self.c.replace_quotes_ix(t.owner, t.usdc, &[(self.market, t.yes, quotes)]);
        let signer = self.keypair(who);
        self.send(ix, &signer)
    }

    fn order_id(&self, who: &str, side: Side, price: u8) -> u64 {
        let (book, owner) = (self.book(), self.people[who].0.pubkey());
        let orders = if side == Side::Buy { book.bids() } else { book.asks() };
        orders.iter().find(|o| book.traders[o.trader as usize].owner == owner && o.price == price).unwrap().order_id
    }

    /// The repeatable check's pass (D97, D99): Return to owner for each balance in the book, sent by the backend's key.
    fn return_balances(&mut self) -> Vec<String> {
        let book = self.book();
        let owed: Vec<String> = PEOPLE
            .iter()
            .filter(|name| book.trader(&self.people[**name].0.pubkey()).is_some_and(|t| t.free_usdc + t.free_yes + t.free_no > 0))
            .map(|name| name.to_string())
            .collect();
        let mut events = vec![];
        for name in owed {
            let ix = self.c.return_to_owner_ix(&self.market, &self.people[&name].1);
            let backend = self.backend.insecure_clone();
            events.extend(self.send(ix, &backend));
        }
        events
    }

    fn amount(&self, key: &Pubkey) -> u64 {
        self.svm.get_account(key).filter(|a| a.lamports > 0).map(|a| u64::from_le_bytes(a.data[64..72].try_into().unwrap())).unwrap_or(0)
    }

    fn supply(&self, mint: &Pubkey) -> u64 {
        u64::from_le_bytes(self.svm.get_account(mint).unwrap().data[36..44].try_into().unwrap())
    }

    fn book(&self) -> Box<Book> {
        Box::new(bytemuck::pod_read_unaligned(&self.svm.get_account(&pda(BOOK_SEED, &self.market)).unwrap().data[8..]))
    }

    /// Everything money-flow.mjs states after a step, read back from the chain, with the book holding no balances.
    fn check(&self, step: &str, e: &Expected) {
        for (name, &(cents, yes, no)) in PEOPLE.iter().zip(e.wallets.iter()) {
            let t = &self.people[*name].1;
            let got = (self.amount(&t.usdc), self.amount(&t.yes), self.amount(&t.no));
            assert_eq!(got, (usdc(cents), yes, no), "{step}: {name}'s USDC, Yes and No");
        }
        let data = self.svm.get_account(&self.market).unwrap().data;
        let market = <meridian::Market as AccountDeserialize>::try_deserialize(&mut &data[..]).unwrap();
        assert_eq!(self.amount(&pda(VAULT_SEED, &self.market)), usdc(e.vault), "{step}: the vault");
        assert_eq!(market.owed, e.pairs, "{step}: the owed counter");
        let supplies = (self.supply(&pda(YES_SEED, &self.market)), self.supply(&pda(NO_SEED, &self.market)));
        assert_eq!(supplies, (e.pairs, e.pairs), "{step}: the supplies");
        let book = self.book();
        assert_eq!((book.locked_usdc(), book.locked_yes()), (usdc(e.locked.0), e.locked.1), "{step}: what the orders lock");
        assert_eq!((book.free_usdc(), book.free_yes(), book.free_no()), (0, 0, 0), "{step}: every balance was returned");
        let accounts = (
            self.amount(&pda(BOOK_USDC_SEED, &self.market)),
            self.amount(&pda(BOOK_YES_SEED, &self.market)),
            self.amount(&pda(BOOK_NO_SEED, &self.market)),
        );
        assert_eq!(accounts, (usdc(e.locked.0), e.locked.1, 0), "{step}: the book's token accounts hold exactly the locks");
        // money-flow.mjs's own check: no USDC appears or vanishes.
        let total: u64 = e.wallets.iter().map(|w| w.0).sum::<u64>() + e.vault + e.locked.0;
        assert_eq!(total, 5 * 2000, "{step}: the table itself adds up");
    }

    /// (owner, price, quantity), best first.
    fn levels(&self, side: Side) -> Vec<(String, u8, u32)> {
        let book = self.book();
        let orders = if side == Side::Buy { book.bids() } else { book.asks() };
        orders.iter().map(|o| (self.who(&book.traders[o.trader as usize].owner), o.price, o.quantity)).collect()
    }
}

fn strings(rows: &[&str]) -> Vec<String> {
    rows.iter().map(|s| s.to_string()).collect()
}

#[test]
fn the_running_examples_day_up_to_the_sweep_matches_money_flow_after_every_step() {
    let mut day = Day::new();
    let start = Expected { wallets: [(2000, 0, 0); 5], vault: 0, pairs: 0, locked: (0, 0) };
    day.check("1 start: 5 wallets x 20.00 USDC", &start);

    // Alice, Bob, Carol, Dave, bot: (USDC in cents, Yes, No).
    day.at("9:10");
    assert_eq!(day.mint("Dave", 10), strings(&["Dave minted 10"]));
    let after_2 = [(2000, 0, 0), (2000, 0, 0), (2000, 0, 0), (1000, 10, 10), (2000, 0, 0)];
    day.check("2 9:10 Dave mints 10 pairs", &Expected { wallets: after_2, vault: 1000, pairs: 10, locked: (0, 0) });

    day.at("9:30");
    day.mint("bot", 5);
    let events = day.quotes("bot", &[(Side::Sell, 66, 5), (Side::Buy, 64, 5)]);
    assert_eq!(events, strings(&["bot placed Sell 5x66¢", "bot placed Buy 5x64¢"]), "nothing to cancel or collect yet");
    let after_3 = [(2000, 0, 0), (2000, 0, 0), (2000, 0, 0), (1000, 10, 10), (1180, 0, 5)];
    day.check("3 9:30 bot mints 5, offers 5 Yes at 66c, bids 5 at 64c", &Expected { wallets: after_3, vault: 1500, pairs: 15, locked: (320, 5) });

    day.at("10:00");
    day.order("Carol", Side::Buy, OrderKind::Limit, 60, 10);
    let after_4 = [(2000, 0, 0), (2000, 0, 0), (1400, 0, 0), (1000, 10, 10), (1180, 0, 5)];
    day.check("4 10:00 Carol bids 10 Yes at 60c", &Expected { wallets: after_4, vault: 1500, pairs: 15, locked: (920, 5) });

    day.at("10:16");
    day.order("Dave", Side::Sell, OrderKind::Limit, 65, 10);
    let after_5 = [(2000, 0, 0), (2000, 0, 0), (1400, 0, 0), (1000, 0, 10), (1180, 0, 5)];
    day.check("5 10:16 Dave offers 10 Yes at 65c", &Expected { wallets: after_5, vault: 1500, pairs: 15, locked: (920, 15) });

    assert_eq!(day.order("Alice", Side::Buy, OrderKind::Market, 66, 10), strings(&["Alice bought 10 Yes at 65¢ from Dave"]));
    assert_eq!(day.return_balances(), strings(&["Dave returned 6500000 USDC, 0 Yes, 0 No"]));
    let after_6 = [(1350, 10, 0), (2000, 0, 0), (1400, 0, 0), (1650, 0, 10), (1180, 0, 5)];
    day.check("6 10:16 Alice Buy Yes 10, at most 66c: 10 for 6.50", &Expected { wallets: after_6, vault: 1500, pairs: 15, locked: (920, 5) });

    // 10:59: the bot's batch cancels both its quotes, re-places them with the bid at 65¢, and collects the 3.20 and 5
    // Yes they had locked; only the 0.05 difference leaves its wallet. Then Dave bids for 5 at 65¢, behind the bot.
    day.at("10:59");
    let events = day.quotes("bot", &[(Side::Sell, 66, 5), (Side::Buy, 65, 5)]);
    assert_eq!(
        events,
        strings(&[
            "bot cancelled Buy 5x64¢ (Owner)",
            "bot cancelled Sell 5x66¢ (Owner)",
            "bot placed Sell 5x66¢",
            "bot placed Buy 5x65¢",
            "bot returned 3200000 USDC, 5 Yes, 0 No",
        ])
    );
    day.order("Dave", Side::Buy, OrderKind::Limit, 65, 5);
    assert_eq!(day.levels(Side::Buy), vec![("bot".into(), 65, 5), ("Dave".into(), 65, 5), ("Carol".into(), 60, 10)]);
    let after_7 = [(1350, 10, 0), (2000, 0, 0), (1400, 0, 0), (1325, 0, 10), (1175, 0, 5)];
    day.check("7 10:59 bot re-bids 5 at 65c; Dave bids 5 at 65c", &Expected { wallets: after_7, vault: 1500, pairs: 15, locked: (1250, 5) });

    day.at("11:00");
    day.next_order_id += 1;
    let args = BuyNoArgs { kind: OrderKind::Market, price: 36, quantity: 10, order_id: day.next_order_id };
    let ix = day.c.buy_no_ix(&day.market, &day.people["Bob"].1, args);
    let bob = day.keypair("Bob");
    assert_eq!(day.send(ix, &bob), strings(&["Bob minted 10", "Bob sold 5 Yes at 65¢ to bot", "Bob sold 5 Yes at 65¢ to Dave"]));
    assert_eq!(day.return_balances(), strings(&["Dave returned 0 USDC, 5 Yes, 0 No", "bot returned 0 USDC, 5 Yes, 0 No"]));
    let after_8 = [(1350, 10, 0), (1650, 0, 10), (1400, 0, 0), (1325, 5, 10), (1175, 5, 5)];
    day.check("8 11:00 Bob Buy No 10, at most 36c: 10 No for 3.50", &Expected { wallets: after_8, vault: 2500, pairs: 25, locked: (600, 5) });

    day.at("11:30");
    let ix = day.c.redeem_ix(&day.market, &day.people["Dave"].1, RedeemMode::Pairs, 5);
    let dave = day.keypair("Dave");
    assert_eq!(day.send(ix, &dave), strings(&["Dave redeemed Pairs: 5 for 5000000"]));
    let after_9 = [(1350, 10, 0), (1650, 0, 10), (1400, 0, 0), (1825, 0, 5), (1175, 5, 5)];
    day.check("9 11:30 Dave closes 5 pairs, gets 5.00 back", &Expected { wallets: after_9, vault: 2000, pairs: 20, locked: (600, 5) });

    day.at("14:00");
    let id = day.order_id("Carol", Side::Buy, 60);
    let ix = day.c.cancel_order_ix(&day.market, day.people["Carol"].0.pubkey(), id);
    let carol = day.keypair("Carol");
    assert_eq!(day.send(ix, &carol), strings(&["Carol cancelled Buy 10x60¢ (Owner)"]));
    assert_eq!(day.return_balances(), strings(&["Carol returned 6000000 USDC, 0 Yes, 0 No"]));
    let after_10 = [(1350, 10, 0), (1650, 0, 10), (2000, 0, 0), (1825, 0, 5), (1175, 5, 5)];
    day.check("10 2:00 PM Carol cancels, 6.00 returned", &Expected { wallets: after_10, vault: 2000, pairs: 20, locked: (0, 5) });

    day.at("16:00");
    let ix = day.c.sweep_ix(&day.market, day.operator.pubkey());
    let operator = day.operator.insecure_clone();
    assert_eq!(day.send(ix, &operator), strings(&["bot cancelled Sell 5x66¢ (Sweep)"]));
    assert_eq!(day.return_balances(), strings(&["bot returned 0 USDC, 5 Yes, 0 No"]));
    let after_11 = [(1350, 10, 0), (1650, 0, 10), (2000, 0, 0), (1825, 0, 5), (1175, 10, 5)];
    day.check("11 4:00 PM close sweep refunds every resting order", &Expected { wallets: after_11, vault: 2000, pairs: 20, locked: (0, 0) });

    // The book is empty: no orders, no balances, nothing in its token accounts, ready for Close book (M3, D50).
    let book = day.book();
    assert!(book.asks().is_empty() && book.bids().is_empty());
    assert!(book.traders.iter().all(|t| t.open_orders == 0 && t.free_usdc + t.free_yes + t.free_no == 0));
    let ix = day.c.sweep_ix(&day.market, day.operator.pubkey());
    assert!(day.send(ix, &operator).is_empty(), "a sweep of the empty book writes nothing");
}
