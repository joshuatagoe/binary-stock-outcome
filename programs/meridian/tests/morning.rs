//! M1's "Done when" (ARCHITECTURE.md §12): the running example's morning in LiteSVM, step by step from
//! packages/golden/morning.json, with every wallet, the vault, the owed counter, the book and the $1 rules checked
//! after each step. Dave mints and offers; Alice buys his 10 Yes at 65¢.
mod common;

use {
    anchor_lang::{prelude::*, solana_program::instruction::Instruction},
    common::{config_for, pda, token_account, Chain, Trader, AT_8_30, AT_9_00, AT_9_30, TOKEN, TOKEN_2022},
    litesvm::LiteSVM,
    meridian::{Book, OrderKind, PlaceOrderArgs, Side, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED, NO_SEED, VAULT_SEED, YES_SEED},
    serde_json::Value,
    solana_account::Account,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
    std::collections::BTreeMap,
};

const MORNING: &str = include_str!("../../../packages/golden/morning.json");

struct Day {
    svm: LiteSVM,
    c: Chain,
    market: Pubkey,
    people: BTreeMap<String, (Keypair, Trader)>,
    next_order_id: u64,
}

impl Day {
    fn send(&mut self, ix: Instruction, signer: &Keypair) {
        let msg = Message::new_with_blockhash(&[ix], Some(&signer.pubkey()), &self.svm.latest_blockhash());
        let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[signer]).unwrap();
        self.svm.send_transaction(tx).unwrap_or_else(|e| panic!("{:?}\n{}", e.err, e.meta.logs.join("\n")));
        self.svm.expire_blockhash();
    }

    fn at(&mut self, hh_mm: &str) {
        let (h, m) = hh_mm.split_once(':').unwrap();
        let minutes_after_9 = (h.parse::<i64>().unwrap() - 9) * 60 + m.parse::<i64>().unwrap();
        let mut clock: Clock = self.svm.get_sysvar();
        clock.unix_timestamp = AT_9_00 + minutes_after_9 * 60;
        self.svm.set_sysvar(&clock);
    }

    fn person(&self, name: &str) -> (&Keypair, &Trader) {
        let (k, t) = &self.people[name];
        (k, t)
    }

    fn order(&mut self, who: &str, side: Side, kind: OrderKind, price: u8, quantity: u32) {
        self.next_order_id += 1;
        let args = PlaceOrderArgs { side, kind, price, quantity, order_id: self.next_order_id };
        let (keypair, trader) = self.person(who);
        let ix = self.c.place_order_ix(&self.market, trader, args);
        let keypair = keypair.insecure_clone();
        self.send(ix, &keypair);
    }

    fn mint(&mut self, who: &str, quantity: u64) {
        let (keypair, trader) = self.person(who);
        let ix = self.c.mint_pairs_ix(&self.market, trader, quantity);
        let keypair = keypair.insecure_clone();
        self.send(ix, &keypair);
    }

    fn amount(&self, key: &Pubkey) -> u64 {
        self.svm.get_account(key).map(|a| u64::from_le_bytes(a.data[64..72].try_into().unwrap())).unwrap_or(0)
    }

    fn supply(&self, mint: &Pubkey) -> u64 {
        u64::from_le_bytes(self.svm.get_account(mint).unwrap().data[36..44].try_into().unwrap())
    }

    fn name_of(&self, owner: &Pubkey) -> String {
        self.people.iter().find(|(_, (k, _))| k.pubkey() == *owner).map(|(n, _)| n.clone()).unwrap_or_default()
    }

    /// Everything morning.json states after a step, read back from the chain.
    fn check(&self, step: &Value) {
        let id = step["id"].as_str().unwrap();
        let after = &step["after"];
        for (name, (_, t)) in &self.people {
            let want = &after["wallets"][name];
            let got = (self.amount(&t.usdc), self.amount(&t.yes), self.amount(&t.no));
            let expected = (want["usdc"].as_u64().unwrap(), want["yes"].as_u64().unwrap(), want["no"].as_u64().unwrap());
            assert_eq!(got, expected, "{id}: {name}'s USDC, Yes and No");
        }
        let vault = self.amount(&pda(VAULT_SEED, &self.market));
        assert_eq!(vault, after["vaultUsdc"].as_u64().unwrap(), "{id}: the vault");
        let pairs = after["pairsOutstanding"].as_u64().unwrap();
        assert_eq!(after["owedUsdc"].as_u64().unwrap(), pairs * 1_000_000, "{id}: the file's own $1 rule");
        if self.svm.get_account(&self.market).is_some() {
            let data = self.svm.get_account(&self.market).unwrap().data;
            let market = <meridian::Market as AccountDeserialize>::try_deserialize(&mut &data[..]).unwrap();
            assert_eq!(market.owed, pairs, "{id}: the owed counter");
            // The $1 rules (D64): the vault holds at least 1.00 per pair, and each supply equals the pairs.
            assert!(vault >= market.owed * 1_000_000, "{id}: vault below owed");
            assert_eq!((self.supply(&pda(YES_SEED, &self.market)), self.supply(&pda(NO_SEED, &self.market))), (pairs, pairs), "{id}: supplies");
        }
        let want_book = &after["book"];
        assert_eq!(self.amount(&pda(BOOK_USDC_SEED, &self.market)), want_book["bookUsdc"].as_u64().unwrap(), "{id}: book USDC");
        assert_eq!(self.amount(&pda(BOOK_YES_SEED, &self.market)), want_book["bookYes"].as_u64().unwrap(), "{id}: book Yes");
        let Some(book_account) = self.svm.get_account(&pda(BOOK_SEED, &self.market)) else { return };
        let book: &Book = bytemuck::from_bytes(&book_account.data[8..]);
        for (side, orders) in [("asks", book.asks()), ("bids", book.bids())] {
            let got: Vec<(String, u64, u64)> =
                orders.iter().map(|o| (self.name_of(&book.traders[o.trader as usize].owner), o.price as u64, o.quantity as u64)).collect();
            let expected: Vec<(String, u64, u64)> = want_book[side]
                .as_array()
                .unwrap()
                .iter()
                .map(|o| (o["owner"].as_str().unwrap().to_string(), o["priceCents"].as_u64().unwrap(), o["quantity"].as_u64().unwrap()))
                .collect();
            assert_eq!(got, expected, "{id}: the book's {side}, best first");
        }
        for (name, want) in want_book["freeBalances"].as_object().unwrap() {
            let owner = self.people[name].0.pubkey();
            let t = book.trader(&owner).unwrap_or_else(|| panic!("{id}: {name} has no entry in the book"));
            assert_eq!((t.free_usdc, t.free_yes), (want["usdc"].as_u64().unwrap(), want["yes"].as_u64().unwrap()), "{id}: {name}'s balance in the book");
        }
    }
}

#[test]
fn the_running_examples_morning_matches_the_golden_file_after_every_step() {
    let golden: Value = serde_json::from_str(MORNING).unwrap();
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
    let start = golden["startingUsdcPerWallet"].as_u64().unwrap();
    let mut people = BTreeMap::new();
    for name in ["Alice", "Bob", "Carol", "Dave", "bot"] {
        let keypair = Keypair::new();
        let t = Trader { owner: keypair.pubkey(), usdc: Pubkey::new_unique(), yes: Pubkey::new_unique(), no: Pubkey::new_unique() };
        svm.set_account(t.owner, Account { lamports: 1_000_000_000, ..Account::default() }).unwrap();
        svm.set_account(t.usdc, token_account(&c.m, TOKEN, c.usdc_mint, t.owner, start)).unwrap();
        svm.set_account(t.yes, token_account(&c.m, TOKEN_2022, pda(YES_SEED, &market), t.owner, 0)).unwrap();
        svm.set_account(t.no, token_account(&c.m, TOKEN_2022, pda(NO_SEED, &market), t.owner, 0)).unwrap();
        people.insert(name.to_string(), (keypair, t));
    }
    let mut day = Day { svm, c, market, people, next_order_id: 0 };

    // 8:30: the operator creates META $680.
    let mut clock: Clock = day.svm.get_sysvar();
    clock.unix_timestamp = AT_8_30;
    day.svm.set_sysvar(&clock);
    let ix = day.c.create_market_ix(operator.pubkey(), &common::meta_680());
    day.send(ix, &operator);

    for step in golden["steps"].as_array().unwrap() {
        let who = step["who"].as_str().unwrap_or("");
        day.at(step["at"].as_str().unwrap());
        let side = |s: &Value| if s.as_str() == Some("sell") { Side::Sell } else { Side::Buy };
        match step["action"].as_str().unwrap() {
            "start" => {}
            "mintPairs" => day.mint(who, step["quantity"].as_u64().unwrap()),
            "mintPairsThenQuote" => {
                day.mint(who, step["mintQuantity"].as_u64().unwrap());
                for q in step["quotes"].as_array().unwrap() {
                    let (price, quantity) = (q["priceCents"].as_u64().unwrap() as u8, q["quantity"].as_u64().unwrap() as u32);
                    day.order(who, side(&q["side"]), OrderKind::Limit, price, quantity);
                }
            }
            "placeLimit" => {
                let (price, quantity) = (step["priceCents"].as_u64().unwrap() as u8, step["quantity"].as_u64().unwrap() as u32);
                day.order(who, side(&step["side"]), OrderKind::Limit, price, quantity);
            }
            "buyYes" => {
                let (price, quantity) = (step["worstPriceCents"].as_u64().unwrap() as u8, step["quantity"].as_u64().unwrap() as u32);
                day.order(who, Side::Buy, OrderKind::Market, price, quantity);
            }
            other => panic!("morning.json has an action this test doesn't know: {other}"),
        }
        day.check(step);
    }
    assert!(AT_9_30 > AT_9_00);
}
