//! The order window on every trade path (ARCHITECTURE.md §5; D37, D43, D68, D102, D143): orders and minting are taken
//! only while a market is Trading and its orders are open. A market the admin holds during the day (Under review)
//! takes none, through any of the five instructions that open positions, while its ways out stay open. The clock's
//! edges and the pause are tested with each instruction (pairs, place_order, buy_no, sell_no, replace_quotes).
mod common;

use {
    anchor_lang::solana_program::instruction::Instruction,
    common::{refused_with, Chain, AT_10_16},
    meridian::{errors::MeridianError, BuyNoArgs, MarketStatus, OrderKind, PlaceOrderArgs, Quote, RedeemMode, SellNoArgs, Side},
};

const USDC: u64 = 1_000_000;

fn ok(c: &mut Chain, ix: &Instruction) {
    let r = c.run(ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
}

#[test]
fn a_market_held_during_the_day_takes_no_orders_and_no_mints_but_lets_people_out() {
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_10_16);
    let dave = c.trader(&market, 20 * USDC);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    ok(&mut c, &ix);
    let rest = PlaceOrderArgs { side: Side::Sell, kind: OrderKind::Limit, price: 65, quantity: 5, order_id: 1 };
    let ix = c.place_order_ix(&market, &dave, rest);
    ok(&mut c, &ix);
    let bid = PlaceOrderArgs { side: Side::Buy, kind: OrderKind::Limit, price: 60, quantity: 1, order_id: 2 };
    let ix = c.place_order_ix(&market, &dave, bid);
    ok(&mut c, &ix);

    c.set_status(&market, MarketStatus::UnderReview);
    let alice = c.trader(&market, 20 * USDC);
    let buy = PlaceOrderArgs { side: Side::Buy, kind: OrderKind::Market, price: 66, quantity: 5, order_id: 1 };
    let quotes = vec![Quote { side: Side::Buy, price: 40, quantity: 1, order_id: 1 }];
    for (label, ix) in [
        ("Mint pairs", c.mint_pairs_ix(&market, &alice, 1)),
        ("Place order", c.place_order_ix(&market, &alice, buy)),
        ("Buy No", c.buy_no_ix(&market, &alice, BuyNoArgs { kind: OrderKind::Market, price: 45, quantity: 1, order_id: 1 })),
        ("Sell No", c.sell_no_ix(&market, &dave, SellNoArgs { price: 66, quantity: 1 })),
        ("Replace quotes", c.replace_quotes_ix(dave.owner, dave.usdc, &[(market, dave.yes, quotes)])),
    ] {
        let r = c.run(&ix);
        assert!(refused_with(&r.program_result, MeridianError::OrdersClosed), "{label}: {:?}", r.program_result);
    }

    // Ways out are never closed (D68): Dave cancels his offer, takes its Yes back and closes 5 pairs.
    let ix = c.cancel_order_ix(&market, dave.owner, 1);
    ok(&mut c, &ix);
    let ix = c.return_to_owner_ix(&market, &dave);
    ok(&mut c, &ix);
    let ix = c.redeem_ix(&market, &dave, RedeemMode::Pairs, 5);
    ok(&mut c, &ix);
    assert_eq!((c.amount(&dave.usdc), c.amount(&dave.yes), c.amount(&dave.no)), (10 * USDC - 60 * 10_000 + 5 * USDC, 5, 5));
}
