//! Bob's No trades from the running example in LiteSVM (ARCHITECTURE.md §3; USERS.md F5, F6 and F7), with every
//! wallet, the vault, the owed counter, both supplies, the book and its three token accounts checked after each, and
//! each transaction's events read back in order (D62).
//!
//! - 11:00, after the morning of packages/golden/morning.json and the 10:59 bids: Bob's Buy No of 10, at most 36¢,
//!   mints 10 pairs and sells their Yes to the bot and Dave at 65¢, so his 10 No cost 3.50 (F5).
//! - Noon, a branch off the main path (F7): the bot takes its 66¢ offer down and Alice offers her 10 Yes at 80¢, so the
//!   best ask is 80¢. Bob's Sell No of 10 buys them for 8.00 and closes the 10 pairs for 10.00: he receives 2.00, a
//!   loss of 1.50.
//! - F6: Bob's Buy No limit of 10 at 33¢ offers 10 Yes at 67¢ as a paired offer, 4 sell, and his cancel closes the
//!   other 6 pairs: 6.00 to his balance in the book.
mod common;

use {
    anchor_lang::{event::EVENT_IX_TAG_LE, prelude::*, solana_program::instruction::Instruction, AnchorDeserialize, Discriminator},
    common::{config_for, pda, token_account, Chain, Trader, AT_8_30, AT_9_00, TOKEN, TOKEN_2022},
    litesvm::LiteSVM,
    meridian::{
        events::{Fill, OrderCancelled, OrderPlaced, PairsMinted, Redeemed},
        Book, BuyNoArgs, OrderKind, PlaceOrderArgs, RedeemMode, SellNoArgs, Side, BOOK_NO_SEED, BOOK_SEED, BOOK_USDC_SEED,
        BOOK_YES_SEED, NO_SEED, PAIRED, VAULT_SEED, YES_SEED,
    },
    serde_json::Value,
    solana_account::Account,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
    std::collections::BTreeMap,
};

const MORNING: &str = include_str!("../../../packages/golden/morning.json");

/// USDC's smallest units in `cents`.
fn usdc(cents: u64) -> u64 {
    cents * 10_000
}

/// What the test reads back after a step. Orders are (owner, price, quantity, paired), best first; balances are
/// (USDC, Yes, No); the book's free balances list only owners with one above zero.
#[derive(Debug, PartialEq)]
struct Snapshot {
    wallets: Vec<(String, u64, u64, u64)>,
    vault: u64,
    owed: u64,
    supplies: (u64, u64),
    asks: Vec<(String, u8, u32, bool)>,
    bids: Vec<(String, u8, u32, bool)>,
    free: Vec<(String, u64, u64, u64)>,
    book_accounts: (u64, u64, u64),
}

struct Day {
    svm: LiteSVM,
    c: Chain,
    market: Pubkey,
    people: BTreeMap<String, (Keypair, Trader)>,
    next_order_id: u64,
    /// Every event the program wrote today, in order, as its call data.
    log: Vec<Vec<u8>>,
}

impl Day {
    /// META $680, created by the operator at 8:30, and five wallets with 20.00 USDC each and empty Yes and No accounts.
    fn new() -> Day {
        let mut c = Chain::new(false);
        let operator = Keypair::new();
        c.operator = operator.pubkey();
        let config = config_for(&c.m, c.usdc_mint, operator.pubkey(), c.admin, 32, false);
        c.set(c.config, config);
        c.set(operator.pubkey(), Account { lamports: 10_000_000_000, ..Account::default() });
        let mut svm = LiteSVM::new();
        svm.add_program(meridian::ID, include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/meridian.so"))).unwrap();
        svm.add_program(TOKEN, include_bytes!("fixtures/spl_token.so")).unwrap();
        svm.add_program(TOKEN_2022, include_bytes!("fixtures/spl_token_2022.so")).unwrap();
        for (key, account) in &c.accounts {
            if !account.executable && account.lamports > 0 {
                svm.set_account(*key, account.clone()).unwrap();
            }
        }
        let market = common::market_pda(&common::meta_680()).0;
        let mut people = BTreeMap::new();
        for name in ["Alice", "Bob", "Carol", "Dave", "bot"] {
            let keypair = Keypair::new();
            let t = Trader { owner: keypair.pubkey(), usdc: Pubkey::new_unique(), yes: Pubkey::new_unique(), no: Pubkey::new_unique() };
            svm.set_account(t.owner, Account { lamports: 1_000_000_000, ..Account::default() }).unwrap();
            svm.set_account(t.usdc, token_account(&c.m, TOKEN, c.usdc_mint, t.owner, usdc(2000))).unwrap();
            svm.set_account(t.yes, token_account(&c.m, TOKEN_2022, pda(YES_SEED, &market), t.owner, 0)).unwrap();
            svm.set_account(t.no, token_account(&c.m, TOKEN_2022, pda(NO_SEED, &market), t.owner, 0)).unwrap();
            people.insert(name.to_string(), (keypair, t));
        }
        let mut day = Day { svm, c, market, people, next_order_id: 0, log: vec![] };
        day.set_clock(AT_8_30);
        let ix = day.c.create_market_ix(operator.pubkey(), &common::meta_680());
        day.send(ix, &operator);
        day
    }

    fn set_clock(&mut self, unix_timestamp: i64) {
        let mut clock: Clock = self.svm.get_sysvar();
        clock.unix_timestamp = unix_timestamp;
        self.svm.set_sysvar(&clock);
    }

    /// The running example's day, by its New York time ("11:00", "12:00").
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
        let events: Vec<Vec<u8>> = meta
            .inner_instructions
            .iter()
            .flatten()
            .filter(|i| msg.account_keys[i.instruction.program_id_index as usize] == meridian::ID)
            .map(|i| i.instruction.data.clone())
            .collect();
        self.log.extend(events.iter().cloned());
        events.iter().map(|data| self.describe(data)).collect()
    }

    /// Every event so far, described, without Create market's.
    fn history(&self) -> Vec<String> {
        self.log.iter().map(|data| self.describe(data)).filter(|e| !e.starts_with("another event")).collect()
    }

    /// The vault and both supplies rebuilt from the events alone, as the backend's store would (D62): PairsMinted
    /// adds 1.00, one Yes and one No per pair; Redeemed (pairs) takes away its USDC and one of each per pair.
    fn replay(&self) -> (u64, (u64, u64)) {
        let (mut vault, mut pairs) = (0, 0);
        for data in &self.log {
            let (discriminator, mut fields) = (&data[8..16], &data[16..]);
            if discriminator == PairsMinted::DISCRIMINATOR {
                let e = PairsMinted::deserialize(&mut fields).unwrap();
                (vault, pairs) = (vault + e.quantity * usdc(100), pairs + e.quantity);
            } else if discriminator == Redeemed::DISCRIMINATOR {
                let e = Redeemed::deserialize(&mut fields).unwrap();
                assert_eq!(e.mode, RedeemMode::Pairs, "no result yet, so only pairs close");
                (vault, pairs) = (vault - e.usdc, pairs - e.quantity);
            }
        }
        (vault, (pairs, pairs))
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
            let (taker, maker) = (self.who(&e.taker), self.who(&e.maker));
            format!("{taker} {verb} {} Yes at {}¢ {preposition} {maker} (taker's order {})", e.quantity, e.price, e.taker_order_id)
        } else if discriminator == Redeemed::DISCRIMINATOR {
            let e = Redeemed::deserialize(&mut fields).unwrap();
            format!("{} redeemed {:?}: {} for {}", self.who(&e.owner), e.mode, e.quantity, e.usdc)
        } else if discriminator == OrderPlaced::DISCRIMINATOR {
            let e = OrderPlaced::deserialize(&mut fields).unwrap();
            format!("{} placed order {}: {:?} {}x{}¢", self.who(&e.owner), e.order_id, e.side, e.quantity, e.price)
        } else if discriminator == OrderCancelled::DISCRIMINATOR {
            let e = OrderCancelled::deserialize(&mut fields).unwrap();
            format!("{} cancelled order {}: {:?} {}x{}¢ ({:?})", self.who(&e.owner), e.order_id, e.side, e.quantity, e.price, e.reason)
        } else {
            // Create market's MarketCreated; any other event in a list the test compares shows up as this.
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

    fn buy_no(&mut self, who: &str, kind: OrderKind, price: u8, quantity: u32) -> Vec<String> {
        self.next_order_id += 1;
        let args = BuyNoArgs { kind, price, quantity, order_id: self.next_order_id };
        let ix = self.c.buy_no_ix(&self.market, &self.people[who].1, args);
        let signer = self.keypair(who);
        self.send(ix, &signer)
    }

    fn sell_no(&mut self, who: &str, price: u8, quantity: u32) -> Vec<String> {
        let ix = self.c.sell_no_ix(&self.market, &self.people[who].1, SellNoArgs { price, quantity });
        let signer = self.keypair(who);
        self.send(ix, &signer)
    }

    fn cancel(&mut self, who: &str, order_id: u64) -> Vec<String> {
        let ix = self.c.cancel_order_ix(&self.market, self.people[who].0.pubkey(), order_id);
        let signer = self.keypair(who);
        self.send(ix, &signer)
    }

    fn amount(&self, key: &Pubkey) -> u64 {
        self.svm.get_account(key).map(|a| u64::from_le_bytes(a.data[64..72].try_into().unwrap())).unwrap_or(0)
    }

    fn supply(&self, mint: &Pubkey) -> u64 {
        u64::from_le_bytes(self.svm.get_account(mint).unwrap().data[36..44].try_into().unwrap())
    }

    fn book(&self) -> Box<Book> {
        Box::new(bytemuck::pod_read_unaligned(&self.svm.get_account(&pda(BOOK_SEED, &self.market)).unwrap().data[8..]))
    }

    /// The ID of `who`'s resting order at `price` on `side`, as what it does with Yes.
    fn order_id(&self, who: &str, side: Side, price: u8) -> u64 {
        let (book, owner) = (self.book(), self.people[who].0.pubkey());
        let orders = if side == Side::Buy { book.bids() } else { book.asks() };
        orders.iter().find(|o| book.traders[o.trader as usize].owner == owner && o.price == price).unwrap().order_id
    }

    fn snapshot(&self) -> Snapshot {
        let book = self.book();
        let levels = |orders: &[meridian::Order]| -> Vec<(String, u8, u32, bool)> {
            orders
                .iter()
                .map(|o| (self.who(&book.traders[o.trader as usize].owner), o.price, o.quantity, o.flags & PAIRED != 0))
                .collect()
        };
        let mut free: Vec<(String, u64, u64, u64)> = book
            .traders
            .iter()
            .filter(|t| t.free_usdc + t.free_yes + t.free_no > 0)
            .map(|t| (self.who(&t.owner), t.free_usdc, t.free_yes, t.free_no))
            .collect();
        free.sort();
        let data = self.svm.get_account(&self.market).unwrap().data;
        let market = <meridian::Market as AccountDeserialize>::try_deserialize(&mut &data[..]).unwrap();
        Snapshot {
            wallets: self.people.iter().map(|(n, (_, t))| (n.clone(), self.amount(&t.usdc), self.amount(&t.yes), self.amount(&t.no))).collect(),
            vault: self.amount(&pda(VAULT_SEED, &self.market)),
            owed: market.owed,
            supplies: (self.supply(&pda(YES_SEED, &self.market)), self.supply(&pda(NO_SEED, &self.market))),
            asks: levels(book.asks()),
            bids: levels(book.bids()),
            free,
            book_accounts: (
                self.amount(&pda(BOOK_USDC_SEED, &self.market)),
                self.amount(&pda(BOOK_YES_SEED, &self.market)),
                self.amount(&pda(BOOK_NO_SEED, &self.market)),
            ),
        }
    }

    /// The morning's steps from morning.json, ending with the wallets its last step states.
    fn morning(&mut self) {
        let golden: Value = serde_json::from_str(MORNING).unwrap();
        let steps = golden["steps"].as_array().unwrap();
        for step in steps {
            let who = step["who"].as_str().unwrap_or("");
            self.at(step["at"].as_str().unwrap());
            let side = |s: &Value| if s.as_str() == Some("sell") { Side::Sell } else { Side::Buy };
            let n = |v: &Value| v.as_u64().unwrap();
            match step["action"].as_str().unwrap() {
                "start" => {}
                "mintPairs" => {
                    self.mint(who, n(&step["quantity"]));
                }
                "mintPairsThenQuote" => {
                    self.mint(who, n(&step["mintQuantity"]));
                    for q in step["quotes"].as_array().unwrap() {
                        self.order(who, side(&q["side"]), OrderKind::Limit, n(&q["priceCents"]) as u8, n(&q["quantity"]) as u32);
                    }
                }
                "placeLimit" => {
                    self.order(who, side(&step["side"]), OrderKind::Limit, n(&step["priceCents"]) as u8, n(&step["quantity"]) as u32);
                }
                "buyYes" => {
                    self.order(who, Side::Buy, OrderKind::Market, n(&step["worstPriceCents"]) as u8, n(&step["quantity"]) as u32);
                }
                other => panic!("morning.json has an action this test doesn't know: {other}"),
            }
        }
        let last = &steps.last().unwrap()["after"]["wallets"];
        for (name, (_, t)) in &self.people {
            let want = (n_of(&last[name]["usdc"]), n_of(&last[name]["yes"]), n_of(&last[name]["no"]));
            assert_eq!((self.amount(&t.usdc), self.amount(&t.yes), self.amount(&t.no)), want, "after the morning: {name}");
        }
    }
}

fn n_of(v: &Value) -> u64 {
    v.as_u64().unwrap()
}

fn wallets(rows: [(&str, u64, u64, u64); 5]) -> Vec<(String, u64, u64, u64)> {
    rows.iter().map(|(n, u, y, no)| (n.to_string(), *u, *y, *no)).collect()
}

fn orders(rows: &[(&str, u8, u32, bool)]) -> Vec<(String, u8, u32, bool)> {
    rows.iter().map(|(n, p, q, paired)| (n.to_string(), *p, *q, *paired)).collect()
}

fn balances(rows: &[(&str, u64, u64, u64)]) -> Vec<(String, u64, u64, u64)> {
    rows.iter().map(|(n, u, y, no)| (n.to_string(), *u, *y, *no)).collect()
}

#[test]
fn bobs_buy_no_at_11_00_and_sell_no_at_noon_move_exactly_the_running_examples_amounts() {
    let mut day = Day::new();
    day.morning();

    // 10:59: the bot moves its bid from 64¢ to 65¢ (the cancel credits its 3.20 to its balance in the book, D99) and
    // Dave bids for 5 at 65¢.
    day.at("10:59");
    let bot_bid = day.order_id("bot", Side::Buy, 64);
    day.cancel("bot", bot_bid);
    day.order("bot", Side::Buy, OrderKind::Limit, 65, 5);
    day.order("Dave", Side::Buy, OrderKind::Limit, 65, 5);

    // 11:00, F5: Buy No 10, paying at most 36¢ per No, so it sells Yes at 64¢ or more.
    day.at("11:00");
    let events = day.buy_no("Bob", OrderKind::Market, 36, 10);
    let bobs = day.next_order_id;
    assert_eq!(
        events,
        vec![
            "Bob minted 10".to_string(),
            format!("Bob sold 5 Yes at 65¢ to bot (taker's order {bobs})"),
            format!("Bob sold 5 Yes at 65¢ to Dave (taker's order {bobs})"),
        ],
        "D62: the mint, then the fills in the order matched"
    );
    assert_eq!(
        day.snapshot(),
        Snapshot {
            wallets: wallets([
                ("Alice", usdc(1350), 10, 0),
                ("Bob", usdc(1650), 0, 10),
                ("Carol", usdc(1400), 0, 0),
                ("Dave", usdc(675), 0, 10),
                ("bot", usdc(855), 0, 5),
            ]),
            vault: usdc(2500),
            owed: 25,
            supplies: (25, 25),
            asks: orders(&[("bot", 66, 5, false)]),
            bids: orders(&[("Carol", 60, 10, false)]),
            free: balances(&[("Dave", usdc(650), 5, 0), ("bot", usdc(320), 5, 0)]),
            book_accounts: (usdc(1570), 15, 0),
        },
        "11:00: Bob paid 10.00 into the vault and got 6.50 from the bids, 3.50 net for 10 No; the bot and Dave each \
         hold 5 Yes in the book until they are returned (D99)"
    );
    assert_eq!(day.replay(), (usdc(2500), (25, 25)), "the events alone give the vault and the supplies (D62)");

    // Noon, F7's branch: the bot takes its 66¢ offer down, and Alice offers her 10 Yes at 80¢.
    day.at("12:00");
    let bot_offer = day.order_id("bot", Side::Sell, 66);
    day.cancel("bot", bot_offer);
    day.order("Alice", Side::Sell, OrderKind::Limit, 80, 10);
    // Sell No 10, paying at most 81¢ per Yes (D15's default worst price, packages/golden/worst-prices.json).
    let events = day.sell_no("Bob", 81, 10);
    assert_eq!(
        events,
        vec!["Bob bought 10 Yes at 80¢ from Alice (taker's order 0)".to_string(), format!("Bob redeemed Pairs: 10 for {}", usdc(1000))],
        "the fill, then the pairs closed; Sell No has no order ID of its own"
    );
    assert_eq!(
        day.snapshot(),
        Snapshot {
            wallets: wallets([
                ("Alice", usdc(1350), 0, 0),
                ("Bob", usdc(1850), 0, 0),
                ("Carol", usdc(1400), 0, 0),
                ("Dave", usdc(675), 0, 10),
                ("bot", usdc(855), 0, 5),
            ]),
            vault: usdc(1500),
            owed: 15,
            supplies: (15, 15),
            asks: vec![],
            bids: orders(&[("Carol", 60, 10, false)]),
            free: balances(&[("Alice", usdc(800), 0, 0), ("Dave", usdc(650), 5, 0), ("bot", usdc(320), 10, 0)]),
            book_accounts: (usdc(2370), 15, 0),
        },
        "noon: Bob paid 8.00 for 10 Yes and got 10.00 for the pairs, so he holds 18.50, a loss of 1.50 on the day"
    );
    assert_eq!(day.replay(), (usdc(1500), (15, 15)), "the events alone give the vault and the supplies (D62)");
}

#[test]
fn a_self_trades_cancel_is_recorded_where_buy_no_and_sell_no_reached_it() {
    // D90: the taker's own resting order is cancelled in the order reached, between the mint and the fills after it.
    let mut day = Day::new();
    day.at("10:00");
    day.order("bot", Side::Buy, OrderKind::Limit, 65, 5);
    day.order("Bob", Side::Buy, OrderKind::Limit, 66, 2);
    let bobs_bid = day.next_order_id;
    let events = day.buy_no("Bob", OrderKind::Market, 36, 5);
    assert_eq!(
        events,
        vec![
            "Bob minted 5".to_string(),
            format!("Bob cancelled order {bobs_bid}: Buy 2x66¢ (SelfTrade)"),
            format!("Bob sold 5 Yes at 65¢ to bot (taker's order {})", day.next_order_id),
        ]
    );

    // Bob mints 4 pairs and offers their Yes at 79¢, under Alice's 10 at 80¢; his Sell No of 9 cancels his own offer
    // first, then buys 9 of Alice's.
    day.at("12:00");
    day.mint("Alice", 10);
    day.order("Alice", Side::Sell, OrderKind::Limit, 80, 10);
    day.mint("Bob", 4);
    day.order("Bob", Side::Sell, OrderKind::Limit, 79, 4);
    let bobs_offer = day.next_order_id;
    let events = day.sell_no("Bob", 81, 9);
    assert_eq!(
        events,
        vec![
            format!("Bob cancelled order {bobs_offer}: Sell 4x79¢ (SelfTrade)"),
            "Bob bought 9 Yes at 80¢ from Alice (taker's order 0)".to_string(),
            format!("Bob redeemed Pairs: 9 for {}", usdc(900)),
        ]
    );
    let bob = day.snapshot().wallets.into_iter().find(|w| w.0 == "Bob").unwrap();
    assert_eq!((bob.2, bob.3), (4, 0), "his offer's 4 Yes are back in his wallet, and his 9 No are closed");
}

#[test]
fn a_buy_no_limit_order_rests_as_a_paired_offer_sells_in_part_and_its_cancel_closes_the_rest() {
    // USERS F6 and packages/golden/returns.json's "bob-buy-no-limit-cancel".
    let mut day = Day::new();
    day.at("10:00");
    let events = day.buy_no("Bob", OrderKind::Limit, 33, 10);
    let id = day.next_order_id;
    assert_eq!(events, vec!["Bob minted 10".to_string(), format!("Bob placed order {id}: Sell 10x67¢")]);
    let untouched = |name: &str| (name.to_string(), usdc(2000), 0, 0);
    assert_eq!(
        day.snapshot(),
        Snapshot {
            wallets: vec![untouched("Alice"), ("Bob".into(), usdc(1000), 0, 0), untouched("Carol"), untouched("Dave"), untouched("bot")],
            vault: usdc(1000),
            owed: 10,
            supplies: (10, 10),
            asks: orders(&[("Bob", 67, 10, true)]),
            bids: vec![],
            free: vec![],
            book_accounts: (0, 10, 10),
        },
        "10.00 locked as 10 pairs: the Yes offered at 67¢, the No waiting in the book (D142)"
    );

    day.at("10:30");
    let events = day.order("Carol", Side::Buy, OrderKind::Market, 67, 4);
    assert_eq!(events, vec![format!("Carol bought 4 Yes at 67¢ from Bob (taker's order {})", day.next_order_id)]);

    day.at("11:00");
    let events = day.cancel("Bob", id);
    assert_eq!(
        events,
        vec![format!("Bob cancelled order {id}: Sell 6x67¢ (Owner)"), format!("Bob redeemed Pairs: 6 for {}", usdc(600))],
        "the cancel, then the 6 pairs it closed, so the events show the burn and the vault's 6.00 (D62)"
    );
    assert_eq!(
        day.history(),
        vec![
            "Bob minted 10".to_string(),
            format!("Bob placed order {id}: Sell 10x67¢"),
            format!("Carol bought 4 Yes at 67¢ from Bob (taker's order {})", id + 1),
            format!("Bob cancelled order {id}: Sell 6x67¢ (Owner)"),
            format!("Bob redeemed Pairs: 6 for {}", usdc(600)),
        ]
    );
    assert_eq!(day.replay(), (usdc(400), (4, 4)), "the day's events replay to the vault's 4.00 and 4 of each token");
    assert_eq!(
        day.snapshot(),
        Snapshot {
            wallets: vec![untouched("Alice"), ("Bob".into(), usdc(1000), 0, 0), ("Carol".into(), usdc(1732), 4, 0), untouched("Dave"), untouched("bot")],
            vault: usdc(400),
            owed: 4,
            supplies: (4, 4),
            asks: vec![],
            bids: vec![],
            free: balances(&[("Bob", usdc(268 + 600), 0, 4)]),
            book_accounts: (usdc(868), 0, 4),
        },
        "\"Order cancelled · 6 pairs closed · 6.00 USDC returned\": Bob spent 10.00 − 2.68 − 6.00 = 1.32 for 4 No"
    );
}
