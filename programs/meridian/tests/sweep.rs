//! The close sweep (ARCHITECTURE.md §6, instruction 15; D37, D99, D142) in Mollusk, on META $680 created by the
//! program: the operator, once orders close, takes resting orders off the book in batches. A bid's USDC and an offer's
//! Yes move to the owner's balance in the book; a paired offer's pairs close at 1.00 each instead. Each call takes at
//! most SWEEP_BATCH orders, and the operator calls again until the book is empty; a call on an empty book does
//! nothing and succeeds. The vault, supply and book checks run inside the program after it (D64, D137).
mod common;

use {
    anchor_lang::{prelude::Pubkey, solana_program::instruction::Instruction},
    common::{pda, refused_with, Chain, Trader, AT_10_16, AT_4_00_PM},
    meridian::{
        errors::MeridianError, BuyNoArgs, MarketStatus, OrderKind, Outcome, PlaceOrderArgs, Side, BOOK_NO_SEED,
        BOOK_USDC_SEED, BOOK_YES_SEED, NO_SEED, SIDE_CAPACITY, SWEEP_BATCH, TRADER_CAPACITY, VAULT_SEED, YES_SEED,
    },
    serde_json::Value,
};

const RETURNS: &str = include_str!("../../../packages/golden/returns.json");
const USDC: u64 = 1_000_000;
const CENT: u64 = 10_000;

fn ok(c: &mut Chain, ix: &Instruction) {
    let r = c.run(ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
}

fn refused(c: &mut Chain, ix: &Instruction, error: MeridianError) {
    let r = c.run(ix);
    assert!(refused_with(&r.program_result, error), "expected {error:?}: {:?}", r.program_result);
}

fn order(side: Side, kind: OrderKind, price: u8, quantity: u32, order_id: u64) -> PlaceOrderArgs {
    PlaceOrderArgs { side, kind, price, quantity, order_id }
}

/// The vault, the owed counter and the Yes and No supplies.
fn money(c: &Chain, market: &Pubkey) -> (u64, u64, u64, u64) {
    (c.amount(&pda(VAULT_SEED, market)), c.market(market).owed, c.supply(&pda(YES_SEED, market)), c.supply(&pda(NO_SEED, market)))
}

fn book_accounts(c: &Chain, market: &Pubkey) -> (u64, u64, u64) {
    (c.amount(&pda(BOOK_USDC_SEED, market)), c.amount(&pda(BOOK_YES_SEED, market)), c.amount(&pda(BOOK_NO_SEED, market)))
}

/// META $680 with USERS.md F10's three kinds of resting order: Bob's Buy No limit of 10 at 33¢ rests as a paired offer
/// at 67¢ and Alice buys 4 of it (F6), so 6 pairs rest; the bot offers 5 Yes at 66¢; Carol bids for 6 at 60¢.
/// Returns the chain, the market, and Bob, the bot and Carol.
struct Close {
    c: Chain,
    market: Pubkey,
    bob: Trader,
    bot: Trader,
    carol: Trader,
}

fn f10_book() -> Close {
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_10_16);
    let bob = c.trader(&market, 20 * USDC);
    let ix = c.buy_no_ix(&market, &bob, BuyNoArgs { kind: OrderKind::Limit, price: 33, quantity: 10, order_id: 7 });
    ok(&mut c, &ix);
    let alice = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &alice, order(Side::Buy, OrderKind::Market, 67, 4, 1));
    ok(&mut c, &ix);
    let bot = c.trader(&market, 20 * USDC);
    let ix = c.mint_pairs_ix(&market, &bot, 5);
    ok(&mut c, &ix);
    let ix = c.place_order_ix(&market, &bot, order(Side::Sell, OrderKind::Limit, 66, 5, 1));
    ok(&mut c, &ix);
    let carol = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &carol, order(Side::Buy, OrderKind::Limit, 60, 6, 1));
    ok(&mut c, &ix);
    Close { c, market, bob, bot, carol }
}

#[test]
fn the_sweep_refunds_every_resting_order_into_its_owners_balance() {
    // packages/golden/returns.json's three "sweep" rows: Carol's bid of 6 at 60¢ refunds 3.60, the bot's offer of 5
    // returns its 5 Yes, and Bob's 6 unsold pairs close for 6.00 (F10).
    let golden: Value = serde_json::from_str(RETURNS).unwrap();
    let row = |id: &str| golden["refunds"].as_array().unwrap().iter().find(|r| r["id"] == id).unwrap().clone();
    let n = |v: &Value| v.as_u64().unwrap();
    let Close { mut c, market, bob, bot, carol } = f10_book();
    assert_eq!(money(&c, &market), (15 * USDC, 15, 15, 15), "Bob's 10 pairs and the bot's 5");
    let before = (c.free(&market, &bob.owner), c.free(&market, &bot.owner), c.free(&market, &carol.owner));
    assert_eq!(before, ((268 * CENT, 0, 4), (0, 0, 0), (0, 0, 0)), "Alice's 4 paid Bob 2.68 and released 4 of his No");

    c.at(AT_4_00_PM);
    let ix = c.sweep_ix(&market, c.operator);
    ok(&mut c, &ix);
    let book = c.book(&market);
    assert!(book.bids().is_empty() && book.asks().is_empty(), "every resting order is off the book");
    let carol_row = row("carol-sweep-users-f10");
    assert_eq!(c.free(&market, &carol.owner), (n(&carol_row["returnedUsdc"]), n(&carol_row["returnedYes"]), 0));
    let bot_row = row("bot-offer-sweep-4pm");
    assert_eq!(c.free(&market, &bot.owner), (n(&bot_row["returnedUsdc"]), n(&bot_row["returnedYes"]), 0));
    let bob_row = row("bob-buy-no-limit-sweep");
    let closed = n(&bob_row["closedPairs"]);
    assert_eq!(c.free(&market, &bob.owner), (268 * CENT + n(&bob_row["returnedUsdc"]), n(&bob_row["returnedYes"]), 4));
    assert_eq!(
        money(&c, &market),
        ((15 - closed) * USDC, 15 - closed, 15 - closed, 15 - closed),
        "the 6 pairs are burned and their 6.00 left the vault"
    );
    assert_eq!(book_accounts(&c, &market), (360 * CENT + 268 * CENT + 6 * USDC, 5, 4), "every balance waits in the book (D99)");
    for t in [&bob, &bot, &carol] {
        assert_eq!(c.book(&market).trader(&t.owner).unwrap().open_orders, 0);
    }
}

/// META $680 with a full book: 64 traders, each with an offer of 1 Yes (36¢ upward) and a bid for 1 (1¢ to 35¢).
fn full_book() -> (Chain, Pubkey, Vec<Trader>) {
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_10_16);
    let mut makers = vec![];
    for i in 0..TRADER_CAPACITY {
        let t = c.trader(&market, 10 * USDC);
        let ix = c.mint_pairs_ix(&market, &t, 1);
        ok(&mut c, &ix);
        let ix = c.place_order_ix(&market, &t, order(Side::Sell, OrderKind::Limit, 36 + i as u8, 1, 1));
        ok(&mut c, &ix);
        let ix = c.place_order_ix(&market, &t, order(Side::Buy, OrderKind::Limit, 1 + (i % 35) as u8, 1, 2));
        ok(&mut c, &ix);
        makers.push(t);
    }
    let book = c.book(&market);
    assert_eq!((book.ask_count as usize, book.bid_count as usize), (SIDE_CAPACITY, SIDE_CAPACITY));
    (c, market, makers)
}

#[test]
fn a_full_book_is_swept_in_batches_and_a_sweep_of_an_empty_book_does_nothing() {
    let (mut c, market, makers) = full_book();
    let locked = (c.book(&market).locked_usdc(), c.book(&market).locked_yes());
    c.at(AT_4_00_PM);
    let ix = c.sweep_ix(&market, c.operator);
    let mut left = 2 * SIDE_CAPACITY;
    let mut calls = 0;
    while left > 0 {
        ok(&mut c, &ix);
        calls += 1;
        let book = c.book(&market);
        let now = book.ask_count as usize + book.bid_count as usize;
        assert_eq!(now, left - left.min(SWEEP_BATCH), "call {calls} takes at most {SWEEP_BATCH}");
        assert_eq!(book.locked_usdc() + book.free_usdc(), locked.0, "no USDC appears or vanishes");
        assert_eq!(book.locked_yes() + book.free_yes(), locked.1);
        left = now;
    }
    assert_eq!(calls, (2 * SIDE_CAPACITY).div_ceil(SWEEP_BATCH));
    for (i, t) in makers.iter().enumerate() {
        let entry = *c.book(&market).trader(&t.owner).unwrap();
        let bid = (1 + (i % 35)) as u64 * CENT;
        assert_eq!((entry.free_usdc, entry.free_yes, entry.free_no, entry.open_orders), (bid, 1, 0, 0), "maker {i}");
    }
    // The bot's job calls until the book is empty; one more call, or a repeat that lands late, changes nothing.
    let before = c.account(&pda(meridian::BOOK_SEED, &market)).unwrap().clone();
    ok(&mut c, &ix);
    assert_eq!(c.account(&pda(meridian::BOOK_SEED, &market)).unwrap(), &before, "an empty book's sweep is a no-op");
    assert_eq!(book_accounts(&c, &market), (locked.0, locked.1, 0));
}

#[test]
fn only_the_operator_sweeps() {
    let Close { mut c, market, .. } = f10_book();
    c.at(AT_4_00_PM);
    for (label, signer) in [("the admin", c.admin), ("a stranger", Pubkey::new_unique())] {
        let ix = c.sweep_ix(&market, signer);
        let r = c.run(&ix);
        assert!(refused_with(&r.program_result, MeridianError::NotOperator), "{label}: {:?}", r.program_result);
    }
    assert_eq!(c.book(&market).ask_count, 2, "nothing was swept");
}

#[test]
fn the_sweep_waits_until_orders_close() {
    // D37, D102: orders close 5 seconds before the stored close, and the sweep may start then.
    for (at, status, refusal) in [
        (AT_4_00_PM - 6, MarketStatus::Trading, Some(MeridianError::BeforeClose)),
        (AT_4_00_PM - 5, MarketStatus::Trading, None),
        // A market the admin holds during the day takes no orders (D68), so its book may be swept.
        (AT_10_16 + 3600, MarketStatus::UnderReview, None),
    ] {
        let Close { mut c, market, .. } = f10_book();
        c.at(at);
        c.set_status(&market, status);
        let ix = c.sweep_ix(&market, c.operator);
        match refusal {
            Some(e) => refused(&mut c, &ix, e),
            None => {
                ok(&mut c, &ix);
                assert_eq!(c.book(&market).ask_count + c.book(&market).bid_count, 0, "at {at}");
            }
        }
    }
}

#[test]
fn the_sweep_runs_while_paused_and_after_settlement() {
    // The pause stops only the trade paths (D68, D143). After settlement a paired offer's pairs still close at 1.00,
    // one winner and one loser each (D143); the vault check then uses the settled rule (D64).
    for (paused, outcome) in [(true, Outcome::None), (false, Outcome::Yes), (false, Outcome::No)] {
        let Close { mut c, market, bob, .. } = f10_book();
        c.set_config(32, paused);
        c.at(AT_4_00_PM + 600);
        if outcome != Outcome::None {
            let mut m = c.market(&market);
            (m.status, m.outcome) = (MarketStatus::Settled, outcome);
            c.set_market(&market, &m);
        }
        let ix = c.sweep_ix(&market, c.operator);
        ok(&mut c, &ix);
        assert_eq!(money(&c, &market), (9 * USDC, 9, 9, 9), "paused {paused}, {outcome:?}");
        assert_eq!(c.free(&market, &bob.owner), (268 * CENT + 6 * USDC, 0, 4));
    }
}

#[test]
fn the_vault_supply_and_book_checks_run_after_the_sweep() {
    // Each state is one a bug could leave; the sweep refuses it rather than add to it (D64, D137).
    let Close { mut c, market, .. } = f10_book();
    c.at(AT_4_00_PM);
    c.set_amount(&pda(VAULT_SEED, &market), 15 * USDC - 1);
    let ix = c.sweep_ix(&market, c.operator);
    refused(&mut c, &ix, MeridianError::VaultShort);

    let Close { mut c, market, .. } = f10_book();
    c.at(AT_4_00_PM);
    let mut m = c.market(&market);
    m.owed = 14;
    c.set_market(&market, &m);
    let ix = c.sweep_ix(&market, c.operator);
    refused(&mut c, &ix, MeridianError::SupplyOverOwed);

    for seed in [BOOK_USDC_SEED, BOOK_YES_SEED, BOOK_NO_SEED] {
        let Close { mut c, market, .. } = f10_book();
        c.at(AT_4_00_PM);
        let key = pda(seed, &market);
        let held = c.amount(&key);
        c.set_amount(&key, held - 1);
        let ix = c.sweep_ix(&market, c.operator);
        refused(&mut c, &ix, MeridianError::BookShort);
    }
}
