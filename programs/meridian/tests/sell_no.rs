//! Sell No (ARCHITECTURE.md §6, instruction 12) in Mollusk, on META $680 created by the program: it buys Yes from
//! offers within its worst price, closes each with one of the taker's No for 1.00 (D38), never rests, and returns the
//! taker's own offers it reaches (D90). The vault, supply and book checks run inside the program after each (D64,
//! D137).
mod common;

use {
    anchor_lang::{prelude::Pubkey, solana_program::instruction::Instruction},
    common::{pda, refused_with, Chain, Trader, AT_4_00_PM, AT_9_30},
    meridian::{
        errors::MeridianError, BuyNoArgs, Order, OrderKind, PlaceOrderArgs, SellNoArgs, Side, BOOK_NO_SEED, BOOK_USDC_SEED,
        BOOK_YES_SEED, NO_SEED, VAULT_SEED, YES_SEED,
    },
};

const USDC: u64 = 1_000_000;
const CENT: u64 = 10_000;
const AT_NOON: i64 = AT_9_30 + 150 * 60;

fn ok(c: &mut Chain, ix: &Instruction) {
    let r = c.run(ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
}

fn refused(c: &mut Chain, ix: &Instruction, error: MeridianError) {
    let r = c.run(ix);
    assert!(refused_with(&r.program_result, error), "expected {error:?}: {:?}", r.program_result);
}

fn offer(price: u8, quantity: u32, order_id: u64) -> PlaceOrderArgs {
    PlaceOrderArgs { side: Side::Sell, kind: OrderKind::Limit, price, quantity, order_id }
}

fn sell_no(price: u8, quantity: u32) -> SellNoArgs {
    SellNoArgs { price, quantity }
}

fn levels(orders: &[Order]) -> Vec<(u8, u32)> {
    orders.iter().map(|o| (o.price, o.quantity)).collect()
}

fn wallet(c: &Chain, t: &Trader) -> (u64, u64, u64) {
    (c.amount(&t.usdc), c.amount(&t.yes), c.amount(&t.no))
}

/// The vault, the owed counter and the Yes and No supplies.
fn money(c: &Chain, market: &Pubkey) -> (u64, u64, u64, u64) {
    (c.amount(&pda(VAULT_SEED, market)), c.market(market).owed, c.supply(&pda(YES_SEED, market)), c.supply(&pda(NO_SEED, market)))
}

/// The book's USDC, Yes and No accounts.
fn book_accounts(c: &Chain, market: &Pubkey) -> (u64, u64, u64) {
    (c.amount(&pda(BOOK_USDC_SEED, market)), c.amount(&pda(BOOK_YES_SEED, market)), c.amount(&pda(BOOK_NO_SEED, market)))
}

/// META $680 at noon: one maker per (price, quantity), who mints that many pairs and offers their Yes, in that order;
/// then Bob, who mints 10 pairs and keeps them. Everyone started with 20.00 USDC.
fn market_with_offers(offers: &[(u8, u32)]) -> (Chain, Pubkey, Trader, Vec<Trader>) {
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_NOON);
    let mut makers = vec![];
    for (i, &(price, quantity)) in offers.iter().enumerate() {
        let t = c.trader(&market, 20 * USDC);
        let ix = c.mint_pairs_ix(&market, &t, quantity as u64);
        ok(&mut c, &ix);
        let ix = c.place_order_ix(&market, &t, offer(price, quantity, i as u64 + 1));
        ok(&mut c, &ix);
        makers.push(t);
    }
    let bob = c.trader(&market, 20 * USDC);
    let ix = c.mint_pairs_ix(&market, &bob, 10);
    ok(&mut c, &ix);
    (c, market, bob, makers)
}

#[test]
fn sell_no_buys_yes_and_closes_each_with_a_no_for_1_00() {
    // F7's noon book: 10 Yes offered at 80¢. Bob's Sell No of 10, paying at most 81¢, buys them for 8.00 and closes
    // 10 pairs for 10.00.
    let (mut c, market, bob, makers) = market_with_offers(&[(80, 10)]);
    assert_eq!(money(&c, &market), (20 * USDC, 20, 20, 20));
    let ix = c.sell_no_ix(&market, &bob, sell_no(81, 10));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (10 * USDC + 10 * USDC - 8 * USDC, 10, 0), "2.00 received; his own 10 Yes untouched");
    assert_eq!(money(&c, &market), (10 * USDC, 10, 10, 10));
    let book = c.book(&market);
    assert!(book.asks().is_empty() && book.bids().is_empty());
    assert_eq!(book.trader(&makers[0].owner).unwrap().free_usdc, 8 * USDC, "the maker's 8.00 waits in the book (D99)");
    assert!(book.trader(&bob.owner).is_none(), "a taker never enters the trader table");
    assert_eq!(book_accounts(&c, &market), (8 * USDC, 0, 0), "the Yes bought were burned in the book");
}

#[test]
fn sell_no_stops_at_its_worst_price_and_never_rests() {
    // Offers of 5 at 80¢ and 5 at 82¢. At most 81¢ buys the first 5; the other 5 Yes are not bid for.
    let (mut c, market, bob, _) = market_with_offers(&[(80, 5), (82, 5)]);
    let ix = c.sell_no_ix(&market, &bob, sell_no(79, 10));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (10 * USDC, 10, 10), "nothing within 79¢: nothing moves");
    let ix = c.sell_no_ix(&market, &bob, sell_no(81, 10));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (10 * USDC + 5 * USDC - 4 * USDC, 10, 5));
    let book = c.book(&market);
    assert_eq!(levels(book.asks()), vec![(82, 5)]);
    assert!(book.bids().is_empty(), "Sell No never rests (D38)");
    assert_eq!(money(&c, &market), (15 * USDC, 15, 15, 15));
}

#[test]
fn sell_no_cancels_the_takers_own_offer_and_returns_its_yes_to_its_wallet() {
    // D90: Bob offers 4 of his Yes at 79¢, the best offer. His Sell No cancels it, the 4 Yes go straight back to his
    // wallet, and the maker's 10 at 80¢ are bought and closed.
    let (mut c, market, bob, _) = market_with_offers(&[(80, 10)]);
    let ix = c.place_order_ix(&market, &bob, offer(79, 4, 1));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (10 * USDC, 6, 10));
    let ix = c.sell_no_ix(&market, &bob, sell_no(81, 10));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (12 * USDC, 10, 0));
    let book = c.book(&market);
    assert!(book.asks().is_empty());
    assert_eq!(book.trader(&bob.owner).unwrap().open_orders, 0);
    assert_eq!((book.free_yes(), book.free_no()), (0, 0), "nothing of Bob's waits in the book");
    assert_eq!(book_accounts(&c, &market), (8 * USDC, 0, 0));
}

#[test]
fn a_taker_holding_only_no_can_sell_no() {
    // The vault's 10.00 reaches Bob before he pays 8.00 for the Yes, so he needs no USDC of his own.
    let (mut c, market, bob, _) = market_with_offers(&[(80, 10)]);
    c.set_amount(&bob.usdc, 0);
    let ix = c.sell_no_ix(&market, &bob, sell_no(81, 10));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (2 * USDC, 10, 0));
}

#[test]
fn buying_from_a_paired_offer_releases_its_no_to_the_owners_balance() {
    // D142: Carol's Buy No limit of 4 at 30¢ rests 4 Yes at 70¢ with their No in the book. Bob's Sell No buys them:
    // Carol is paid 2.80 and her 4 No move to her balance in the book.
    let (mut c, market, bob, _) = market_with_offers(&[]);
    let carol = c.trader(&market, 20 * USDC);
    let ix = c.buy_no_ix(&market, &carol, BuyNoArgs { kind: OrderKind::Limit, price: 30, quantity: 4, order_id: 1 });
    ok(&mut c, &ix);
    assert_eq!(book_accounts(&c, &market), (0, 4, 4));
    let ix = c.sell_no_ix(&market, &bob, sell_no(75, 4));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (10 * USDC + 4 * USDC - 280 * CENT, 10, 6));
    let entry = *c.book(&market).trader(&carol.owner).unwrap();
    assert_eq!((entry.free_usdc, entry.free_yes, entry.free_no, entry.open_orders), (280 * CENT, 0, 4, 0));
    assert_eq!(book_accounts(&c, &market), (280 * CENT, 0, 4));
    assert_eq!(money(&c, &market), (10 * USDC, 10, 10, 10));
}

#[test]
fn a_sell_no_reaching_the_takers_own_paired_offer_moves_its_pairs_to_its_book_balance() {
    // D142's trade-off: Bob's own paired offer of 2 at 75¢ is cancelled with its Yes and No kept together in his book
    // balance, not closed; the maker's 2 at 80¢ are then bought and closed with his wallet's No.
    let (mut c, market, bob, _) = market_with_offers(&[(80, 2)]);
    let ix = c.buy_no_ix(&market, &bob, BuyNoArgs { kind: OrderKind::Limit, price: 25, quantity: 2, order_id: 3 });
    ok(&mut c, &ix);
    let ix = c.sell_no_ix(&market, &bob, sell_no(80, 2));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (10 * USDC - 2 * USDC + 2 * USDC - 160 * CENT, 10, 8));
    let entry = *c.book(&market).trader(&bob.owner).unwrap();
    assert_eq!((entry.free_usdc, entry.free_yes, entry.free_no, entry.open_orders), (0, 2, 2, 0));
    assert_eq!(book_accounts(&c, &market), (160 * CENT, 2, 2));
    assert_eq!(money(&c, &market), (12 * USDC, 12, 12, 12));
}

#[test]
fn the_fill_limit_stops_a_sell_no() {
    let (mut c, market, bob, _) = market_with_offers(&[(80, 1), (81, 1), (82, 1)]);
    c.set_config(2, false);
    let ix = c.sell_no_ix(&market, &bob, sell_no(90, 3));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (10 * USDC + 2 * USDC - 161 * CENT, 10, 8));
    assert_eq!(levels(c.book(&market).asks()), vec![(82, 1)]);
    assert!(c.book(&market).bids().is_empty());
}

#[test]
fn a_paused_market_refuses_sell_no() {
    let (mut c, market, bob, _) = market_with_offers(&[(80, 10)]);
    c.set_config(32, true);
    let ix = c.sell_no_ix(&market, &bob, sell_no(81, 10));
    refused(&mut c, &ix, MeridianError::Paused);
}

#[test]
fn sell_no_is_taken_from_9_30_until_5_seconds_before_the_close() {
    for (at, refusal) in [
        (AT_9_30 - 1, Some(MeridianError::NotOpenYet)),
        (AT_9_30, None),
        (AT_4_00_PM - 6, None),
        (AT_4_00_PM - 5, Some(MeridianError::OrdersClosed)),
    ] {
        let (mut c, market, bob, _) = market_with_offers(&[(80, 10)]);
        c.at(at);
        let ix = c.sell_no_ix(&market, &bob, sell_no(81, 10));
        match refusal {
            Some(e) => refused(&mut c, &ix, e),
            None => ok(&mut c, &ix),
        }
    }
}

#[test]
fn sell_no_trades_from_the_takers_own_accounts_only() {
    let (mut c, market, bob, makers) = market_with_offers(&[(80, 10)]);
    let maker = &makers[0];
    for theirs in [Trader { usdc: maker.usdc, ..bob }, Trader { no: maker.no, ..bob }] {
        let ix = c.sell_no_ix(&market, &theirs, sell_no(81, 10));
        refused(&mut c, &ix, MeridianError::NotYourAccount);
    }
    // The Yes account is used only for the taker's own offers it reaches (D90), and must be the taker's then too.
    let ix = c.place_order_ix(&market, &bob, offer(79, 4, 1));
    ok(&mut c, &ix);
    let ix = c.sell_no_ix(&market, &Trader { yes: maker.yes, ..bob }, sell_no(81, 10));
    refused(&mut c, &ix, MeridianError::NotYourAccount);
}

#[test]
fn sell_no_checks_its_price_and_quantity() {
    let (mut c, market, bob, _) = market_with_offers(&[(80, 10)]);
    for price in [0, 100] {
        let ix = c.sell_no_ix(&market, &bob, sell_no(price, 1));
        refused(&mut c, &ix, MeridianError::InvalidPrice);
    }
    let ix = c.sell_no_ix(&market, &bob, sell_no(81, 0));
    refused(&mut c, &ix, MeridianError::InvalidQuantity);
}

#[test]
fn a_sell_no_closing_more_pairs_than_the_taker_has_no_for_fails_whole() {
    // Bob holds 10 No; 12 Yes are bought, so the burn of his No fails with Token-2022's InsufficientFunds (error 1),
    // which fails the whole transaction.
    let (mut c, market, bob, _) = market_with_offers(&[(80, 12)]);
    let ix = c.sell_no_ix(&market, &bob, sell_no(81, 12));
    let r = c.run(&ix);
    assert_eq!(format!("{:?}", r.program_result), "Failure(Custom(1))", "the burn of his 10 No, not a check of ours");
}

#[test]
fn the_vault_supply_and_book_checks_run_after_sell_no() {
    // Each state below is one a bug could leave; Sell No must refuse it (D64, D137).
    let (mut c, market, bob, _) = market_with_offers(&[(80, 10)]);
    c.set_amount(&pda(VAULT_SEED, &market), 20 * USDC - 1);
    let ix = c.sell_no_ix(&market, &bob, sell_no(81, 10));
    refused(&mut c, &ix, MeridianError::VaultShort);

    let (mut c, market, bob, _) = market_with_offers(&[(80, 10)]);
    let mut m = c.market(&market);
    m.owed -= 1;
    c.set_market(&market, &m);
    let ix = c.sell_no_ix(&market, &bob, sell_no(81, 10));
    refused(&mut c, &ix, MeridianError::SupplyOverOwed);

    // Two offers of 5 lock 10 Yes; one Yes goes missing. Buying the first 5 leaves 4 against the 5 still offered.
    let (mut c, market, bob, _) = market_with_offers(&[(80, 5), (85, 5)]);
    c.set_amount(&pda(BOOK_YES_SEED, &market), 9);
    let ix = c.sell_no_ix(&market, &bob, sell_no(81, 5));
    refused(&mut c, &ix, MeridianError::BookShort);
}
