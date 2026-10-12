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

#[test]
fn orders_open_at_9_30_and_close_5_seconds_before_the_close() {
    // D46, D102, by the chain's clock.
    for (at, refused) in [(common::AT_9_30 - 1, Some(MeridianError::NotOpenYet)), (common::AT_9_30, None), (common::AT_4_00_PM - 6, None), (common::AT_4_00_PM - 5, Some(MeridianError::OrdersClosed))] {
        let mut mk = full_book(Order::reaching(Side::Buy, 1));
        mk.m.sysvars.clock.unix_timestamp = at;
        let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
        match refused {
            Some(e) => assert!(refused_with(&r.program_result, e), "at {at}: {:?}", r.program_result),
            None => assert!(r.program_result.is_ok(), "at {at}: {:?}", r.program_result),
        }
    }
}

#[test]
fn the_taker_trades_from_its_own_accounts_only() {
    let mut mk = full_book(Order::reaching(Side::Buy, 1));
    let taker_yes = mk.taker_yes;
    let account = mk.account_mut(taker_yes);
    account.data[32..64].copy_from_slice(anchor_lang::prelude::Pubkey::new_unique().as_ref());
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(refused_with(&r.program_result, MeridianError::NotYourAccount), "{:?}", r.program_result);
}

#[test]
fn another_markets_yes_mint_is_refused() {
    let mut mk = full_book(Order::reaching(Side::Buy, 1));
    let yes_mint = common::pda(meridian::YES_SEED, &common::market_pda(&common::meta_680()).0);
    let meta = mk.ix.accounts.iter_mut().find(|m| m.pubkey == yes_mint).unwrap();
    let other = anchor_lang::prelude::Pubkey::new_unique();
    meta.pubkey = other;
    mk.accounts.push((other, solana_account::Account::default()));
    let r = mk.m.process_instruction(&mk.ix, &mk.accounts);
    assert!(common::refused_by_anchor(&r.program_result, anchor_lang::error::ErrorCode::ConstraintSeeds), "{:?}", r.program_result);
}

fn cancel_ix(mk: &OrderSetup, owner: anchor_lang::prelude::Pubkey, order_id: u64) -> anchor_lang::solana_program::instruction::Instruction {
    use anchor_lang::{InstructionData, ToAccountMetas};
    let (config, market, usdc_mint) = (mk.ix.accounts[0].pubkey, mk.ix.accounts[1].pubkey, mk.ix.accounts[8].pubkey);
    let event_authority = anchor_lang::prelude::Pubkey::find_program_address(&[b"__event_authority"], &meridian::ID).0;
    let metas = meridian::accounts::CancelOrder {
        config,
        market,
        book: mk.book,
        owner,
        book_usdc: mk.book_usdc,
        book_yes: mk.book_yes,
        book_no: common::pda(meridian::BOOK_NO_SEED, &market),
        vault: common::pda(meridian::VAULT_SEED, &market),
        yes_mint: common::pda(meridian::YES_SEED, &market),
        no_mint: common::pda(meridian::NO_SEED, &market),
        usdc_mint,
        token_program: common::TOKEN,
        token_2022_program: common::TOKEN_2022,
        event_authority,
        program: meridian::ID,
    }
    .to_account_metas(None);
    anchor_lang::solana_program::instruction::Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::CancelOrder { order_id }.data() }
}

#[test]
fn the_owner_cancels_and_what_it_locked_waits_in_the_book() {
    // D99: Carol-like, a resting bid of 3 at 30¢ is cancelled; 0.90 moves to the owner's balance in the book.
    let taker = anchor_lang::prelude::Pubkey::new_unique();
    let own = PlaceOrderArgs { side: Side::Buy, kind: OrderKind::Limit, price: 30, quantity: 3, order_id: 9 };
    let mut mk = full_book(Order { makers: 4, taker_rests: Some(own), taker: Some(taker), ..Order::reaching(Side::Buy, 1) });
    let ix = cancel_ix(&mk, taker, 9);
    mk.accounts.push((taker, solana_account::Account { lamports: 1_000_000_000, ..Default::default() }));
    fill_missing(&mut mk, &ix);
    let r = mk.m.process_instruction(&ix, &mk.accounts);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    let book: &Book = bytemuck::from_bytes(&r.get_account(&mk.book).unwrap().data[8..]);
    assert_eq!(book.trader(&taker).unwrap().free_usdc, 90 * CENT);
    assert!(book.bids().iter().all(|o| o.price != 30));
    let stranger = anchor_lang::prelude::Pubkey::new_unique();
    mk.accounts.push((stranger, solana_account::Account { lamports: 1_000_000_000, ..Default::default() }));
    let r = mk.m.process_instruction(&cancel_ix(&mk, stranger, 9), &mk.accounts);
    assert!(refused_with(&r.program_result, MeridianError::OrderNotFound), "only the owner's own order");
}

#[test]
fn cancelling_works_while_paused_and_after_the_close() {
    // D68: never paused.
    let taker = anchor_lang::prelude::Pubkey::new_unique();
    let own = PlaceOrderArgs { side: Side::Sell, kind: OrderKind::Limit, price: 90, quantity: 1, order_id: 4 };
    let mut mk = full_book(Order { makers: 4, taker_rests: Some(own), taker: Some(taker), paused: true, ..Order::reaching(Side::Buy, 1) });
    mk.m.sysvars.clock.unix_timestamp = common::AT_4_00_PM + 60;
    mk.accounts.push((taker, solana_account::Account { lamports: 1_000_000_000, ..Default::default() }));
    let ix = cancel_ix(&mk, taker, 4);
    fill_missing(&mut mk, &ix);
    let r = mk.m.process_instruction(&ix, &mk.accounts);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
}

/// Accounts a plain cancel lists but doesn't use (the book's No account, the vault, the No mint, D142) exist only as
/// empty placeholders in a test book.
fn fill_missing(mk: &mut OrderSetup, ix: &anchor_lang::solana_program::instruction::Instruction) {
    for meta in &ix.accounts {
        if !mk.accounts.iter().any(|(k, _)| *k == meta.pubkey) {
            mk.accounts.push((meta.pubkey, solana_account::Account::default()));
        }
    }
}
