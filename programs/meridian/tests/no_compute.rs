//! Buy No and Sell No at the fill limit (D21, M1.01), measured in Mollusk on books the program built itself: the worst
//! cases M1's spike estimated, against the 1,400,000 compute units a transaction may use and the 200,000 an
//! instruction gets without asking for more, which no wallet then needs to raise. Run with `-- --nocapture` for the
//! table.
mod common;

use {
    anchor_lang::{prelude::Pubkey, solana_program::instruction::Instruction},
    common::{refused_with, Chain, Trader, AT_9_30},
    meridian::{errors::MeridianError, BuyNoArgs, OrderKind, PlaceOrderArgs, SellNoArgs, Side},
};

const LIMIT: u64 = 1_400_000;
const DEFAULT_BUDGET: u64 = 200_000;
const FILL_LIMIT: u32 = 32;
const USDC: u64 = 1_000_000;

fn run(c: &mut Chain, ix: &Instruction) -> u64 {
    let r = c.run(ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    r.compute_units_consumed
}

/// META $680 at 10:00 with `makers` traders, each minting 1 pair, offering its Yes at 36¢ upward and bidding for 1 Yes
/// at 1¢ to 35¢, as tests/common's full book does; and a taker with 1,000.00 USDC and 32 pairs of its own.
fn book_of(makers: usize) -> (Chain, Pubkey, Trader) {
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_9_30 + 30 * 60);
    for i in 0..makers {
        let t = c.trader(&market, 10 * USDC);
        let ix = c.mint_pairs_ix(&market, &t, 1);
        run(&mut c, &ix);
        let offer = PlaceOrderArgs { side: Side::Sell, kind: OrderKind::Limit, price: 36 + i as u8, quantity: 1, order_id: 1 };
        let ix = c.place_order_ix(&market, &t, offer);
        run(&mut c, &ix);
        let bid = PlaceOrderArgs { side: Side::Buy, kind: OrderKind::Limit, price: 1 + (i % 35) as u8, quantity: 1, order_id: 2 };
        let ix = c.place_order_ix(&market, &t, bid);
        run(&mut c, &ix);
    }
    let taker = c.trader(&market, 1_000 * USDC);
    let ix = c.mint_pairs_ix(&market, &taker, FILL_LIMIT as u64);
    run(&mut c, &ix);
    (c, market, taker)
}

#[test]
fn buy_no_and_sell_no_fit_at_the_fill_limit() {
    // A Market Buy No that reaches every bid, on a full book: it stops at 32 fills and mints 32 pairs.
    let (mut c, market, taker) = book_of(64);
    let ix = c.buy_no_ix(&market, &taker, BuyNoArgs { kind: OrderKind::Market, price: 99, quantity: 64, order_id: 1 });
    let buy_no = run(&mut c, &ix);
    assert_eq!(c.book(&market).bid_count as u32, 64 - FILL_LIMIT);

    // A Sell No that reaches every offer, on a full book: it buys and closes 32.
    let (mut c, market, taker) = book_of(64);
    let ix = c.sell_no_ix(&market, &taker, SellNoArgs { price: 99, quantity: 64 });
    let sell_no = run(&mut c, &ix);
    assert_eq!(c.book(&market).ask_count as u32, 64 - FILL_LIMIT);

    // A Limit Buy No that fills 31 bids (every bid at 17¢ or more) and rests the other 9 pairs as the 64th offer, in
    // front of the other 63: the most work a resting Buy No does on this book, since a 32nd fill would stop it at the
    // limit (63 makers, so its owner can take the last trader entry).
    let (mut c, market, taker) = book_of(63);
    let ix = c.buy_no_ix(&market, &taker, BuyNoArgs { kind: OrderKind::Limit, price: 83, quantity: 40, order_id: 1 });
    let buy_no_rest = run(&mut c, &ix);
    let book = c.book(&market);
    assert_eq!((book.ask_count, book.asks()[0].price, book.asks()[0].quantity), (64, 17, 9));

    // A Sell No that reaches the taker's own offer (D90), second in line at 36¢ (35¢ would sell into the best bid), among
    // 31 fills: the one extra token transfer, its Yes back to the taker's wallet, on top of 32 matches.
    let (mut c, market, taker) = book_of(63);
    let own = PlaceOrderArgs { side: Side::Sell, kind: OrderKind::Limit, price: 36, quantity: 1, order_id: 9 };
    let ix = c.place_order_ix(&market, &taker, own);
    run(&mut c, &ix);
    let ix = c.sell_no_ix(&market, &taker, SellNoArgs { price: 99, quantity: 64 });
    let sell_no_own = run(&mut c, &ix);
    assert_eq!((c.book(&market).ask_count, c.amount(&taker.yes), c.amount(&taker.no)), (63 - 31, FILL_LIMIT as u64, 1));

    // The same Limit Buy No from a taker who already rests a bid, so it has a trader entry and the book scans all 127
    // resting orders for its order ID first (D101). Reusing the bid's ID is refused, which shows the scan runs.
    let (mut c, market, taker) = book_of(63);
    let own = PlaceOrderArgs { side: Side::Buy, kind: OrderKind::Limit, price: 1, quantity: 1, order_id: 5 };
    let ix = c.place_order_ix(&market, &taker, own);
    run(&mut c, &ix);
    let reused = c.buy_no_ix(&market, &taker, BuyNoArgs { kind: OrderKind::Limit, price: 83, quantity: 40, order_id: 5 });
    assert!(refused_with(&c.run(&reused).program_result, MeridianError::DuplicateOrderId));
    let ix = c.buy_no_ix(&market, &taker, BuyNoArgs { kind: OrderKind::Limit, price: 83, quantity: 40, order_id: 6 });
    let buy_no_scan = run(&mut c, &ix);
    let book = c.book(&market);
    assert_eq!((book.bid_count, book.ask_count, book.asks()[0].quantity), (64 - 31, 64, 9));

    println!("instruction                                CU  share of 1.4M");
    for (name, cu) in [
        ("Buy No, market, 32 fills", buy_no),
        ("Sell No, 32 fills", sell_no),
        ("Buy No, limit, 31 fills + rest", buy_no_rest),
        ("Sell No, own offer + 31 fills", sell_no_own),
        ("Buy No, limit, ID scan + 31 fills + rest", buy_no_scan),
    ] {
        println!("{name:<40} {cu:>8}  {:>5.1}%", 100.0 * cu as f64 / LIMIT as f64);
        assert!(cu <= LIMIT, "{name}: {cu} CU is past a transaction's 1,400,000");
        assert!(cu <= DEFAULT_BUDGET, "{name}: {cu} CU needs more than an instruction's default 200,000 (D21, M1.01)");
    }
}
