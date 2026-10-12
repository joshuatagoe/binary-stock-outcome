//! Place order (ARCHITECTURE.md §6, instruction 10) in Mollusk, in M1-a's form: the taker's tokens move, and the
//! refusals the book's own tests can't reach (pause, a short book, a passed-in book account). The matching rules are
//! tested in src/book.rs.
mod common;

use {
    common::{full_book, refused_with, token_amount, Order, OrderSetup},
    meridian::{errors::MeridianError, Book, OrderKind, PlaceOrderArgs, Side},
};

/// The taker's and the book's balances: taker USDC, taker Yes, book USDC, book Yes.
fn balances(mk: &mut OrderSetup) -> [u64; 4] {
    [mk.taker_usdc, mk.taker_yes, mk.book_usdc, mk.book_yes].map(|k| token_amount(mk.account_mut(k)))
}

const CENT: u64 = 10_000;

#[test]
fn a_buy_moves_usdc_into_the_book_and_yes_to_the_taker() {
    // The three cheapest offers: 36¢, 37¢ and 38¢, 1 Yes each, so 1.11 USDC.
    let mut mk = full_book(Order::reaching(Side::Buy, 3));
    let before: Vec<u64> = [mk.taker_usdc, mk.taker_yes, mk.book_usdc, mk.book_yes].iter().map(|k| token_amount(mk.account_mut(*k))).collect();
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    let after: Vec<u64> = [mk.taker_usdc, mk.taker_yes, mk.book_usdc, mk.book_yes].iter().map(|k| token_amount(r.get_account(k).unwrap())).collect();
    assert_eq!(before[0] - after[0], 111 * CENT, "the taker paid 1.11");
    assert_eq!(after[1] - before[1], 3, "the taker got 3 Yes");
    assert_eq!(after[2] - before[2], 111 * CENT, "the makers' 1.11 waits in the book (D99)");
    assert_eq!(before[3] - after[3], 3, "the offers' 3 Yes left the book");
}

#[test]
fn a_sell_moves_yes_into_the_book_and_usdc_to_the_taker() {
    // The three best bids: 35¢, 34¢ and 33¢, so 1.02 USDC.
    let mut mk = full_book(Order::reaching(Side::Sell, 3));
    let before: Vec<u64> = [mk.taker_usdc, mk.taker_yes, mk.book_usdc, mk.book_yes].iter().map(|k| token_amount(mk.account_mut(*k))).collect();
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    let after: Vec<u64> = [mk.taker_usdc, mk.taker_yes, mk.book_usdc, mk.book_yes].iter().map(|k| token_amount(r.get_account(k).unwrap())).collect();
    assert_eq!(after[0] - before[0], 102 * CENT, "the taker received 1.02");
    assert_eq!(before[1] - after[1], 3);
    assert_eq!(before[2] - after[2], 102 * CENT, "paid from the bids' locked USDC");
    assert_eq!(after[3] - before[3], 3, "the bidders' 3 Yes wait in the book (D99)");
}

#[test]
fn a_limit_remainder_on_a_full_side_is_refused() {
    // D107: a full side refuses a new resting order, and the whole order with it.
    let mk = full_book(Order { kind: OrderKind::Limit, price: 37, quantity: 5, ..Order::reaching(Side::Buy, 1) });
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(refused_with(&r.program_result, MeridianError::BookFull), "{:?}", r.program_result);
}

#[test]
fn a_paused_market_refuses_orders() {
    let mk = full_book(Order { paused: true, ..Order::reaching(Side::Buy, 1) });
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(refused_with(&r.program_result, MeridianError::Paused), "{:?}", r.program_result);
}

#[test]
fn an_unset_fill_limit_refuses_orders() {
    // Devnet's Config was created with a fill limit of 0 (M0); Update config sets it (M1-c).
    let mk = full_book(Order { fill_limit: 0, ..Order::reaching(Side::Buy, 1) });
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(refused_with(&r.program_result, MeridianError::FillLimitNotSet), "{:?}", r.program_result);
}

#[test]
fn a_donation_to_the_book_does_not_stop_trading() {
    let mut mk = full_book(Order::reaching(Side::Buy, 1));
    let book_usdc = mk.book_usdc;
    let account = mk.account_mut(book_usdc);
    let donated = token_amount(account) + 1;
    account.data[64..72].copy_from_slice(&donated.to_le_bytes());
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
}

#[test]
fn a_book_holding_less_than_it_owes_refuses_every_order() {
    // Any bug that left the book short would show here, after the instruction (§5).
    let mut mk = full_book(Order::reaching(Side::Buy, 1));
    let book_usdc = mk.book_usdc;
    let account = mk.account_mut(book_usdc);
    let short = token_amount(account) - 1;
    account.data[64..72].copy_from_slice(&short.to_le_bytes());
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(refused_with(&r.program_result, MeridianError::BookShort), "{:?}", r.program_result);
}

#[test]
fn the_taker_cannot_pass_the_books_account_as_its_own() {
    // D30's duplicate-account attack.
    let mut mk = full_book(Order::reaching(Side::Sell, 1));
    let taker_usdc_meta = mk.ix.accounts.iter().position(|a| a.pubkey == mk.taker_usdc).unwrap();
    mk.ix.accounts[taker_usdc_meta].pubkey = mk.book_usdc;
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(refused_with(&r.program_result, MeridianError::DuplicateAccount), "{:?}", r.program_result);
}

#[test]
fn a_limit_remainder_rests_and_its_usdc_is_locked_in_the_book() {
    // Four makers offer at 36¢ to 39¢. A Limit buy of 5 at 37¢ fills 36¢ and 37¢ (0.73) and rests 3 at 37¢ (1.11).
    let mut mk = full_book(Order { kind: OrderKind::Limit, price: 37, quantity: 5, makers: 4, ..Order::reaching(Side::Buy, 1) });
    let before = balances(&mut mk);
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    let after: Vec<u64> = [mk.taker_usdc, mk.taker_yes, mk.book_usdc, mk.book_yes].iter().map(|k| token_amount(r.get_account(k).unwrap())).collect();
    assert_eq!(before[0] - after[0], 184 * CENT, "0.73 for the fills and 1.11 locked by the resting bid");
    assert_eq!(after[1] - before[1], 2);
    assert_eq!(after[2] - before[2], 184 * CENT);
    let book: &Book = bytemuck::from_bytes(&r.get_account(&mk.book).unwrap().data[8..]);
    assert_eq!((book.bids()[0].price, book.bids()[0].quantity), (37, 3), "the best bid now");
}

#[test]
fn a_self_trade_returns_the_takers_own_offer_to_its_wallet() {
    // The taker already offers 2 Yes at 35¢, the best offer. Its Market buy of 1 at up to 36¢ cancels that offer,
    // which sends the 2 Yes back to its wallet in the same transaction (D90), then buys a maker's 1 at 36¢.
    let own = PlaceOrderArgs { side: Side::Sell, kind: OrderKind::Limit, price: 35, quantity: 2, order_id: 9 };
    let mut mk = full_book(Order { price: 36, quantity: 1, makers: 4, taker_rests: Some(own), ..Order::reaching(Side::Buy, 1) });
    let before = balances(&mut mk);
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    let after: Vec<u64> = [mk.taker_usdc, mk.taker_yes, mk.book_usdc, mk.book_yes].iter().map(|k| token_amount(r.get_account(k).unwrap())).collect();
    assert_eq!(before[0] - after[0], 36 * CENT, "it paid only for the maker's Yes");
    assert_eq!(after[1] - before[1], 3, "its own 2 back, and the 1 bought");
    assert_eq!(before[3] - after[3], 3);
    let book: &Book = bytemuck::from_bytes(&r.get_account(&mk.book).unwrap().data[8..]);
    assert_eq!(book.asks()[0].price, 37, "its offer and the 36¢ offer are gone");
    assert_eq!((book.free_usdc(), book.free_yes()), (36 * CENT, 0), "only the maker's 0.36 waits in the book");
}
