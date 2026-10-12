//! Buy No and the cancel of its paired offer (ARCHITECTURE.md §6, instructions 11 and 13) in Mollusk, on META $680
//! created by the program: the pairs it mints, what it sells and keeps, the paired offer's No in the book (D142), and
//! the refusals. The vault, supply and book checks run inside the program after each (D64, D137).
mod common;

use {
    anchor_lang::{prelude::Pubkey, solana_program::instruction::Instruction},
    common::{pda, refused_with, Chain, Trader, AT_4_00_PM, AT_9_30},
    meridian::{
        errors::MeridianError, BuyNoArgs, MarketStatus, Order, OrderKind, Outcome, PlaceOrderArgs, Side, BOOK_NO_SEED,
        BOOK_USDC_SEED, BOOK_YES_SEED, NO_SEED, PAIRED, SIDE_CAPACITY, TRADER_CAPACITY, VAULT_SEED, YES_SEED,
    },
};

const USDC: u64 = 1_000_000;
const CENT: u64 = 10_000;
const AT_11_00: i64 = AT_9_30 + 90 * 60;

fn ok(c: &mut Chain, ix: &Instruction) {
    let r = c.run(ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
}

fn refused(c: &mut Chain, ix: &Instruction, error: MeridianError) {
    let r = c.run(ix);
    assert!(refused_with(&r.program_result, error), "expected {error:?}: {:?}", r.program_result);
}

fn bid(price: u8, quantity: u32, order_id: u64) -> PlaceOrderArgs {
    PlaceOrderArgs { side: Side::Buy, kind: OrderKind::Limit, price, quantity, order_id }
}

fn buy_no(kind: OrderKind, price: u8, quantity: u32, order_id: u64) -> BuyNoArgs {
    BuyNoArgs { kind, price, quantity, order_id }
}

fn levels(orders: &[Order]) -> Vec<(u8, u32)> {
    orders.iter().map(|o| (o.price, o.quantity)).collect()
}

/// A wallet's USDC, Yes and No.
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

/// META $680 at 11:00: Bob with 20.00 USDC, and one bidder per (price, quantity), each with 20.00 USDC, bidding in
/// that order.
fn market_with_bids(bids: &[(u8, u32)]) -> (Chain, Pubkey, Trader, Vec<Trader>) {
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_11_00);
    let bob = c.trader(&market, 20 * USDC);
    let mut bidders = vec![];
    for (i, &(price, quantity)) in bids.iter().enumerate() {
        let t = c.trader(&market, 20 * USDC);
        let ix = c.place_order_ix(&market, &t, bid(price, quantity, i as u64 + 1));
        ok(&mut c, &ix);
        bidders.push(t);
    }
    (c, market, bob, bidders)
}

#[test]
fn a_market_buy_no_mints_only_the_pairs_it_sells() {
    // F5's partial fill: only 6 Yes are bid for at 65¢, so Bob's Buy No of 10 at 36¢ buys 6 No for 2.10.
    let (mut c, market, bob, bidders) = market_with_bids(&[(65, 6)]);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Market, 36, 10, 1));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (20 * USDC - 210 * CENT, 0, 6), "6 No for 2.10 and no stray Yes (D5)");
    assert_eq!(money(&c, &market), (6 * USDC, 6, 6, 6));
    let book = c.book(&market);
    assert!(book.asks().is_empty() && book.bids().is_empty(), "the other 4 are not placed");
    assert_eq!(book.trader(&bidders[0].owner).unwrap().free_yes, 6, "the bidder's 6 Yes wait in the book (D99)");
    assert_eq!(book_accounts(&c, &market), (0, 6, 0));
}

#[test]
fn a_limit_buy_no_rests_its_unsold_pairs_as_a_paired_offer() {
    // F6: Buy No · Limit · 10 at 33¢ sells Yes at 67¢ or more. A bid of 3 at 70¢ takes 3; the 65¢ bid is too low, so
    // 7 pairs rest: their Yes offered at 67¢, their No in the book's No account (D142).
    let (mut c, market, bob, bidders) = market_with_bids(&[(70, 3), (65, 5)]);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Limit, 33, 10, 7));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (20 * USDC - 10 * USDC + 210 * CENT, 0, 3), "10.00 for 10 pairs, 2.10 back for 3 Yes");
    assert_eq!(money(&c, &market), (10 * USDC, 10, 10, 10));
    let book = c.book(&market);
    let offer = book.asks()[0];
    assert_eq!((offer.price, offer.quantity, offer.flags, offer.order_id), (67, 7, PAIRED, 7));
    assert_eq!(book.traders[offer.trader as usize].owner, bob.owner);
    assert_eq!(levels(book.bids()), vec![(65, 5)]);
    assert_eq!(book.trader(&bidders[0].owner).unwrap().free_yes, 3);
    assert_eq!(book_accounts(&c, &market), (325 * CENT, 3 + 7, 7), "the 65¢ bid's lock; 3 Yes bought and 7 offered; 7 No");
}

#[test]
fn a_buy_no_sells_at_its_worst_price_and_no_lower() {
    // At most 36¢ per No is at least 64¢ per Yes: the 65¢ bid fills and the 63¢ bid is left.
    let (mut c, market, bob, _) = market_with_bids(&[(65, 5), (63, 5)]);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Market, 36, 10, 1));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (20 * USDC - 5 * USDC + 325 * CENT, 0, 5));
    assert_eq!(levels(c.book(&market).bids()), vec![(63, 5)]);
    assert_eq!(money(&c, &market), (5 * USDC, 5, 5, 5));
}

#[test]
fn a_buy_no_cancels_the_takers_own_bid_and_returns_its_usdc_to_its_wallet() {
    // D90: Bob's own bid of 2 at 66¢ is the best. His Buy No of 5 cancels it, its 1.32 comes straight back, and the
    // 5 Yes sell to the 65¢ bid: 20.00 − 1.32 + 1.32 + 3.25 − 5.00.
    let (mut c, market, bob, _) = market_with_bids(&[(65, 5)]);
    let ix = c.place_order_ix(&market, &bob, bid(66, 2, 3));
    ok(&mut c, &ix);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Market, 36, 5, 4));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (20 * USDC + 325 * CENT - 5 * USDC, 0, 5));
    let book = c.book(&market);
    assert!(book.bids().is_empty());
    let entry = book.trader(&bob.owner).unwrap();
    assert_eq!((entry.free_usdc, entry.open_orders), (0, 0), "nothing waits in the book for Bob");
    assert_eq!(book_accounts(&c, &market), (0, 5, 0));
}

#[test]
fn a_taker_needs_only_the_net_price_of_its_no() {
    // The bids' 6.50 reaches Bob before the vault takes 10.00, so 3.50 is enough for F5's Buy No of 10.
    let (mut c, market, bob, _) = market_with_bids(&[(65, 10)]);
    c.set_amount(&bob.usdc, 350 * CENT);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Market, 36, 10, 1));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (0, 0, 10));
}

#[test]
fn the_fill_limit_stops_a_buy_no_and_nothing_rests() {
    // D138: at a fill limit of 2, a Limit Buy No reaching three bids sells 2, mints 2, and places nothing more.
    let (mut c, market, bob, _) = market_with_bids(&[(65, 1), (64, 1), (63, 1)]);
    c.set_config(2, false);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Limit, 40, 3, 1));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (20 * USDC - 2 * USDC + 129 * CENT, 0, 2));
    let book = c.book(&market);
    assert!(book.asks().is_empty(), "nothing rests");
    assert_eq!(levels(book.bids()), vec![(63, 1)]);
    assert_eq!(money(&c, &market), (2 * USDC, 2, 2, 2));
}

#[test]
fn a_paused_market_refuses_buy_no() {
    let (mut c, market, bob, _) = market_with_bids(&[(65, 5)]);
    c.set_config(32, true);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Market, 36, 5, 1));
    refused(&mut c, &ix, MeridianError::Paused);
}

#[test]
fn buy_no_is_taken_from_9_30_until_5_seconds_before_the_close() {
    for (at, refusal) in [
        (AT_9_30 - 1, Some(MeridianError::NotOpenYet)),
        (AT_9_30, None),
        (AT_4_00_PM - 6, None),
        (AT_4_00_PM - 5, Some(MeridianError::OrdersClosed)),
    ] {
        let (mut c, market, bob, _) = market_with_bids(&[(65, 5)]);
        c.at(at);
        let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Market, 36, 5, 1));
        match refusal {
            Some(e) => refused(&mut c, &ix, e),
            None => ok(&mut c, &ix),
        }
    }
}

#[test]
fn buy_no_trades_from_the_takers_own_accounts_only() {
    let (mut c, market, bob, _) = market_with_bids(&[(65, 5)]);
    let alice = c.trader(&market, 20 * USDC);
    let theirs_no = Trader { no: alice.no, ..bob };
    let ix = c.buy_no_ix(&market, &theirs_no, buy_no(OrderKind::Market, 36, 5, 1));
    refused(&mut c, &ix, MeridianError::NotYourAccount);
    let theirs_usdc = Trader { usdc: alice.usdc, ..bob };
    let ix = c.buy_no_ix(&market, &theirs_usdc, buy_no(OrderKind::Market, 36, 5, 1));
    refused(&mut c, &ix, MeridianError::NotYourAccount);
    // D30's duplicate-account attack, with the vault or the book's USDC account as the taker's.
    for usdc in [pda(VAULT_SEED, &market), pda(BOOK_USDC_SEED, &market)] {
        let ix = c.buy_no_ix(&market, &Trader { usdc, ..bob }, buy_no(OrderKind::Market, 36, 5, 1));
        refused(&mut c, &ix, MeridianError::DuplicateAccount);
    }
}

#[test]
fn a_buy_no_limit_whose_pairs_cant_rest_on_a_full_ask_side_is_refused_whole() {
    // D107, D138: one maker offers 64 Yes, one per order at 90¢, which fills the ask side. Bob's Buy No Limit of 10 at
    // 36¢ would sell 5 into the 65¢ bid and rest 5 pairs: refused whole, the sale included. A Market Buy No still trades.
    let (mut c, market, bob, _) = market_with_bids(&[(65, 5)]);
    let maker = c.trader(&market, 100 * USDC);
    let ix = c.mint_pairs_ix(&market, &maker, SIDE_CAPACITY as u64);
    ok(&mut c, &ix);
    for order_id in 1..=SIDE_CAPACITY as u64 {
        let offer = PlaceOrderArgs { side: Side::Sell, kind: OrderKind::Limit, price: 90, quantity: 1, order_id };
        let ix = c.place_order_ix(&market, &maker, offer);
        ok(&mut c, &ix);
    }
    assert_eq!(c.book(&market).ask_count as usize, SIDE_CAPACITY);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Limit, 36, 10, 1));
    refused(&mut c, &ix, MeridianError::BookFull);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Market, 36, 10, 2));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (20 * USDC - 5 * USDC + 325 * CENT, 0, 5));
}

#[test]
fn a_buy_no_limit_whose_pairs_cant_rest_in_a_full_trader_table_is_refused_whole() {
    // D107, D138: 64 traders rest bids, one of them 5 at 65¢; the ask side is empty. Bob has no entry and none is free,
    // so his Buy No Limit, which would sell 5 and rest 5, is refused whole. A Market Buy No still trades.
    let mut bids = vec![(65, 5)];
    bids.extend(std::iter::repeat_n((10, 1), TRADER_CAPACITY - 1));
    let (mut c, market, bob, _) = market_with_bids(&bids);
    let book = c.book(&market);
    assert!(book.traders.iter().all(|t| t.owner != Pubkey::default()) && book.asks().is_empty());
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Limit, 36, 10, 1));
    refused(&mut c, &ix, MeridianError::BookFull);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Market, 36, 10, 2));
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (20 * USDC - 5 * USDC + 325 * CENT, 0, 5));
}

#[test]
fn buy_no_checks_its_price_quantity_and_order_id() {
    let (mut c, market, bob, _) = market_with_bids(&[(65, 5)]);
    for price in [0, 100, 255] {
        let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Market, price, 5, 1));
        refused(&mut c, &ix, MeridianError::InvalidPrice);
    }
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Market, 36, 0, 1));
    refused(&mut c, &ix, MeridianError::InvalidQuantity);
    // D101: a second order with the ID of Bob's resting paired offer is refused while it rests.
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Limit, 20, 2, 9));
    ok(&mut c, &ix);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Market, 36, 1, 9));
    refused(&mut c, &ix, MeridianError::DuplicateOrderId);
}

#[test]
fn the_vault_supply_and_book_checks_run_after_buy_no() {
    // Each state below is one a bug could leave; the next Buy No must refuse it rather than add to it (D64, D137).
    let setup = || {
        let (mut c, market, bob, _) = market_with_bids(&[(65, 5)]);
        let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Limit, 20, 10, 1));
        ok(&mut c, &ix);
        assert_eq!(money(&c, &market), (10 * USDC, 10, 10, 10), "a paired offer of 10 at 80¢");
        (c, market, bob)
    };
    let next = |c: &Chain, market: &Pubkey, bob: &Trader| c.buy_no_ix(market, bob, buy_no(OrderKind::Market, 36, 1, 2));

    let (mut c, market, bob) = setup();
    c.set_amount(&pda(VAULT_SEED, &market), 10 * USDC - 1);
    let ix = next(&c, &market, &bob);
    refused(&mut c, &ix, MeridianError::VaultShort);

    let (mut c, market, bob) = setup();
    let mut m = c.market(&market);
    m.owed -= 1;
    c.set_market(&market, &m);
    let ix = next(&c, &market, &bob);
    refused(&mut c, &ix, MeridianError::SupplyOverOwed);

    let (mut c, market, bob) = setup();
    c.set_amount(&pda(BOOK_NO_SEED, &market), 9);
    let ix = next(&c, &market, &bob);
    refused(&mut c, &ix, MeridianError::BookShort);
}

#[test]
fn cancelling_a_paired_offer_closes_its_pairs_into_the_owners_balance_even_paused_and_after_the_close() {
    // D39, D142, D68: Bob's 10 unsold pairs burn, and their 10.00 moves from the vault to his balance in the book.
    let (mut c, market, bob, _) = market_with_bids(&[]);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Limit, 33, 10, 7));
    ok(&mut c, &ix);
    assert_eq!((money(&c, &market), book_accounts(&c, &market)), ((10 * USDC, 10, 10, 10), (0, 10, 10)));
    c.set_config(32, true);
    c.at(AT_4_00_PM + 60);
    let ix = c.cancel_order_ix(&market, bob.owner, 7);
    ok(&mut c, &ix);
    assert_eq!(money(&c, &market), (0, 0, 0, 0));
    assert_eq!(book_accounts(&c, &market), (10 * USDC, 0, 0));
    let book = c.book(&market);
    assert!(book.asks().is_empty());
    let entry = book.trader(&bob.owner).unwrap();
    assert_eq!((entry.free_usdc, entry.free_yes, entry.free_no, entry.open_orders), (10 * USDC, 0, 0, 0));
    assert_eq!(wallet(&c, &bob), (10 * USDC, 0, 0), "his wallet is unchanged: the 10.00 waits for Return to owner (D99)");
}

#[test]
fn only_the_owner_cancels_a_paired_offer() {
    let (mut c, market, bob, _) = market_with_bids(&[]);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Limit, 33, 10, 7));
    ok(&mut c, &ix);
    let ix = c.cancel_order_ix(&market, Pubkey::new_unique(), 7);
    refused(&mut c, &ix, MeridianError::OrderNotFound);
    // Carol rests a bid with the same ID, 7. Her cancel takes only her own bid; Bob's pairs stay open.
    let carol = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &carol, bid(50, 2, 7));
    ok(&mut c, &ix);
    let ix = c.cancel_order_ix(&market, carol.owner, 7);
    ok(&mut c, &ix);
    let book = c.book(&market);
    assert!(book.bids().is_empty());
    let offer = book.asks()[0];
    assert_eq!((offer.quantity, offer.flags, book.traders[offer.trader as usize].owner), (10, PAIRED, bob.owner));
    assert_eq!(book.trader(&carol.owner).unwrap().free_usdc, 100 * CENT);
    assert_eq!(money(&c, &market), (10 * USDC, 10, 10, 10), "no pairs closed");
}

/// Bob's Buy No Limit of 10 at 33¢ rests 10 pairs at 67¢ and Carol buys 4; then the market settles with `outcome`
/// and Bob cancels. A pair is worth 1.00 under either result, so the 6 unsold pairs still close, as the sweep's would
/// after Settle (D142).
fn cancel_after_settlement(outcome: Outcome) {
    let (mut c, market, bob, _) = market_with_bids(&[]);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Limit, 33, 10, 7));
    ok(&mut c, &ix);
    let carol = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &carol, PlaceOrderArgs { side: Side::Buy, kind: OrderKind::Market, price: 67, quantity: 4, order_id: 1 });
    ok(&mut c, &ix);
    let mut m = c.market(&market);
    (m.status, m.outcome) = (MarketStatus::Settled, outcome);
    c.set_market(&market, &m);
    c.at(AT_4_00_PM + 600);
    let ix = c.cancel_order_ix(&market, bob.owner, 7);
    ok(&mut c, &ix);
    let (vault, owed, yes, no) = money(&c, &market);
    assert_eq!((vault, owed, yes, no), (4 * USDC, 4, 4, 4), "Carol's 4 Yes and Bob's 4 No are left");
    // check_vault's rule for a settled market, which the program checked before it succeeded (D64).
    let winning = if outcome == Outcome::Yes { yes } else { no };
    assert!(vault >= owed * USDC && winning <= owed);
    assert_eq!(book_accounts(&c, &market), (268 * CENT + 6 * USDC, 0, 4));
    let entry = *c.book(&market).trader(&bob.owner).unwrap();
    assert_eq!((entry.free_usdc, entry.free_yes, entry.free_no), (268 * CENT + 6 * USDC, 0, 4));
}

#[test]
fn a_paired_offer_cancelled_after_yes_wins_still_closes_its_pairs() {
    cancel_after_settlement(Outcome::Yes);
}

#[test]
fn a_paired_offer_cancelled_after_no_wins_still_closes_its_pairs() {
    cancel_after_settlement(Outcome::No);
}

#[test]
fn a_paired_offers_cancel_checks_the_books_no_account_after() {
    // Bob's paired offer of 10 sells 4, which releases 4 No to his balance; the book's No account is then made 1
    // short. Cancelling burns the other 6 and finds the account below the 4 it owes him.
    let (mut c, market, bob, _) = market_with_bids(&[]);
    let ix = c.buy_no_ix(&market, &bob, buy_no(OrderKind::Limit, 33, 10, 7));
    ok(&mut c, &ix);
    let carol = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &carol, PlaceOrderArgs { side: Side::Buy, kind: OrderKind::Market, price: 67, quantity: 4, order_id: 1 });
    ok(&mut c, &ix);
    assert_eq!(book_accounts(&c, &market), (268 * CENT, 6, 10));
    c.set_amount(&pda(BOOK_NO_SEED, &market), 9);
    let ix = c.cancel_order_ix(&market, bob.owner, 7);
    refused(&mut c, &ix, MeridianError::BookShort);
}
