//! Replace quotes (ARCHITECTURE.md §6, instruction 14; D111, D142) in Mollusk, on markets created by the program: any
//! maker cancels its own plain orders on each listed book, places its new quotes as Limit orders under Place order's
//! rules, and collects its free USDC and Yes from the book. Paired offers stay (D142), and so does a free No balance,
//! which Return to owner pays. The book's checks run inside the program after each book (D137).
mod common;

use {
    anchor_lang::{error::ErrorCode, prelude::Pubkey, solana_program::instruction::Instruction},
    common::{pda, refused_by_anchor, refused_with, token_account, Chain, Trader, AT_10_16, AT_4_00_PM, AT_8_30, AT_9_30, TOKEN_2022},
    meridian::{
        errors::MeridianError, BuyNoArgs, CreateMarketArgs, MarketStatus, Order, OrderKind, PlaceOrderArgs, Quote, Side,
        BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED, PAIRED, VAULT_SEED, YES_SEED,
    },
};

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

fn offer(price: u8, quantity: u32, order_id: u64) -> Quote {
    Quote { side: Side::Sell, price, quantity, order_id }
}

fn bid(price: u8, quantity: u32, order_id: u64) -> Quote {
    Quote { side: Side::Buy, price, quantity, order_id }
}

/// (owner, price, quantity, paired), best first.
fn levels(c: &Chain, market: &Pubkey, side: Side) -> Vec<(Pubkey, u8, u32, bool)> {
    let book = c.book(market);
    let orders: &[Order] = if side == Side::Buy { book.bids() } else { book.asks() };
    orders.iter().map(|o| (book.traders[o.trader as usize].owner, o.price, o.quantity, o.flags & PAIRED != 0)).collect()
}

fn wallet(c: &Chain, t: &Trader) -> (u64, u64, u64) {
    (c.amount(&t.usdc), c.amount(&t.yes), c.amount(&t.no))
}

fn book_accounts(c: &Chain, market: &Pubkey) -> (u64, u64) {
    (c.amount(&pda(BOOK_USDC_SEED, market)), c.amount(&pda(BOOK_YES_SEED, market)))
}

/// The maker's Replace quotes on one book.
fn replace(c: &Chain, market: &Pubkey, maker: &Trader, quotes: Vec<Quote>) -> Instruction {
    c.replace_quotes_ix(maker.owner, maker.usdc, &[(*market, maker.yes, quotes)])
}

/// META $680 at 10:16, and the bot with 20.00 USDC that mints 5 pairs: 15.00, 5 Yes, 5 No.
fn bot_on_meta_680() -> (Chain, Pubkey, Trader) {
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_10_16);
    let bot = c.trader(&market, 20 * USDC);
    let ix = c.mint_pairs_ix(&market, &bot, 5);
    ok(&mut c, &ix);
    (c, market, bot)
}

#[test]
fn the_bot_replaces_its_quotes_and_collects_its_balances() {
    // The 9:30 quotes of §3: an offer of 5 Yes at 66¢ and a bid for 5 at 64¢ lock 5 Yes and 3.20.
    let (mut c, market, bot) = bot_on_meta_680();
    let ix = replace(&c, &market, &bot, vec![offer(66, 5, 1), bid(64, 5, 2)]);
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bot), (15 * USDC - 320 * CENT, 0, 5));
    assert_eq!(levels(&c, &market, Side::Sell), vec![(bot.owner, 66, 5, false)]);
    assert_eq!(levels(&c, &market, Side::Buy), vec![(bot.owner, 64, 5, false)]);

    // Alice buys 2 of its Yes (1.32 to its balance) and Eve sells it 1 (1 Yes to its balance).
    let alice = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &alice, order(Side::Buy, OrderKind::Market, 66, 2, 1));
    ok(&mut c, &ix);
    let eve = c.trader(&market, 20 * USDC);
    let ix = c.mint_pairs_ix(&market, &eve, 1);
    ok(&mut c, &ix);
    let ix = c.place_order_ix(&market, &eve, order(Side::Sell, OrderKind::Market, 64, 1, 1));
    ok(&mut c, &ix);
    assert_eq!(c.free(&market, &bot.owner), (132 * CENT, 1, 0));

    // It moves to 67¢ and 65¢, reusing its order IDs: the old 3 offered and 4 bid for are cancelled (3 Yes and 2.56 to
    // its balance), the new offer of 3 locks 3 Yes and the new bid 3.25, and its balance, 3.88 and 4 Yes, is collected.
    // Only the difference moves: 0.63 and 1 Yes come back to its wallet.
    let ix = replace(&c, &market, &bot, vec![offer(67, 3, 1), bid(65, 5, 2)]);
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bot), (15 * USDC - 320 * CENT + 63 * CENT, 1, 5));
    assert_eq!(c.free(&market, &bot.owner), (0, 0, 0), "everything free was collected");
    assert_eq!(levels(&c, &market, Side::Sell), vec![(bot.owner, 67, 3, false)]);
    assert_eq!(levels(&c, &market, Side::Buy), vec![(bot.owner, 65, 5, false)]);
    assert_eq!(book_accounts(&c, &market), (325 * CENT, 3), "only its new quotes' locks are in the book");
    // Its wallet plus its locks: 15.00 + 1.32 for 2 sold − 0.64 for 1 bought, and 5 − 2 + 1 Yes.
    assert_eq!(c.amount(&bot.usdc) + 325 * CENT, 15 * USDC + 132 * CENT - 64 * CENT);
    assert_eq!(c.amount(&bot.yes) + 3, 4);
}

#[test]
fn replace_quotes_leaves_paired_offers_and_other_makers_orders_alone() {
    // D142: Bob's Buy No limit rests 10 pairs at 67¢; he also bids for 2 at 50¢. Carol bids for 3 at 55¢.
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_10_16);
    let bob = c.trader(&market, 20 * USDC);
    let ix = c.buy_no_ix(&market, &bob, BuyNoArgs { kind: OrderKind::Limit, price: 33, quantity: 10, order_id: 7 });
    ok(&mut c, &ix);
    let ix = c.place_order_ix(&market, &bob, order(Side::Buy, OrderKind::Limit, 50, 2, 8));
    ok(&mut c, &ix);
    let carol = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &carol, order(Side::Buy, OrderKind::Limit, 55, 3, 1));
    ok(&mut c, &ix);
    assert_eq!(c.amount(&bob.usdc), 9 * USDC);

    // Bob's batch replaces his plain bid only: its 1.00 comes back and his new bid of 4 at 52¢ locks 2.08.
    let ix = replace(&c, &market, &bob, vec![bid(52, 4, 9)]);
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (9 * USDC + 100 * CENT - 208 * CENT, 0, 0));
    assert_eq!(levels(&c, &market, Side::Sell), vec![(bob.owner, 67, 10, true)], "his paired offer still rests");
    assert_eq!(levels(&c, &market, Side::Buy), vec![(carol.owner, 55, 3, false), (bob.owner, 52, 4, false)]);
    assert_eq!(c.book(&market).trader(&bob.owner).unwrap().open_orders, 2);
    assert_eq!(c.free(&market, &carol.owner), (0, 0, 0));
    assert_eq!(c.amount(&carol.usdc), 20 * USDC - 165 * CENT, "Carol's bid and USDC are untouched");

    // Eve, with nothing on the book, can't reach anyone's orders: her empty batch changes nothing.
    let eve = c.trader(&market, 20 * USDC);
    let before = c.account(&pda(BOOK_SEED, &market)).unwrap().clone();
    let ix = replace(&c, &market, &eve, vec![]);
    ok(&mut c, &ix);
    assert_eq!(c.account(&pda(BOOK_SEED, &market)).unwrap(), &before);
}

#[test]
fn a_free_no_balance_waits_for_return_to_owner() {
    // Bob's paired offer of 2 sells to Alice, which releases 2 No to his balance (D142). Replace quotes lists no No
    // accounts, so it collects his 1.34 and leaves the No, and his entry, for Return to owner.
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_10_16);
    let bob = c.trader(&market, 20 * USDC);
    let ix = c.buy_no_ix(&market, &bob, BuyNoArgs { kind: OrderKind::Limit, price: 33, quantity: 2, order_id: 7 });
    ok(&mut c, &ix);
    let alice = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &alice, order(Side::Buy, OrderKind::Market, 67, 2, 1));
    ok(&mut c, &ix);
    let ix = replace(&c, &market, &bob, vec![]);
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (18 * USDC + 134 * CENT, 0, 0));
    assert_eq!(c.free(&market, &bob.owner), (0, 0, 2));
    let ix = c.return_to_owner_ix(&market, &bob);
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (18 * USDC + 134 * CENT, 0, 2));
}

#[test]
fn a_quote_that_crosses_the_book_trades_as_place_order_would() {
    // D111: the same rules as Place order. Carol offers 3 Yes at 66¢; the bot's bid for 5 at 67¢ buys them at 66¢
    // (D42), its Yes straight to its wallet, and rests the other 2 at 67¢.
    let (mut c, market, bot) = bot_on_meta_680();
    let carol = c.trader(&market, 20 * USDC);
    let ix = c.mint_pairs_ix(&market, &carol, 3);
    ok(&mut c, &ix);
    let ix = c.place_order_ix(&market, &carol, order(Side::Sell, OrderKind::Limit, 66, 3, 1));
    ok(&mut c, &ix);
    let ix = replace(&c, &market, &bot, vec![bid(67, 5, 1)]);
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bot), (15 * USDC - 198 * CENT - 134 * CENT, 5 + 3, 5));
    assert_eq!(c.free(&market, &carol.owner), (198 * CENT, 0, 0));
    assert!(levels(&c, &market, Side::Sell).is_empty());
    assert_eq!(levels(&c, &market, Side::Buy), vec![(bot.owner, 67, 2, false)]);
}

/// META $690, created before the open, and a Yes account of `owner` on it.
fn second_market(c: &mut Chain, owner: &Pubkey) -> (Pubkey, Pubkey) {
    let now = c.m.sysvars.clock.unix_timestamp;
    c.at(AT_8_30);
    let args = CreateMarketArgs { strike_cents: 69_000, ..common::meta_680() };
    let ix = c.create_market_ix(c.operator, &args);
    ok(c, &ix);
    c.at(now);
    let market = common::market_pda(&args).0;
    let yes = Pubkey::new_unique();
    let account = token_account(&c.m, TOKEN_2022, pda(YES_SEED, &market), *owner, 0);
    c.set(yes, account);
    (market, yes)
}

#[test]
fn one_batch_replaces_quotes_on_several_books() {
    let (mut c, m680, bot) = bot_on_meta_680();
    let (m690, yes_690) = second_market(&mut c, &bot.owner);
    let ix = c.replace_quotes_ix(bot.owner, bot.usdc, &[(m680, bot.yes, vec![bid(40, 5, 1)]), (m690, yes_690, vec![bid(30, 5, 1)])]);
    ok(&mut c, &ix);
    assert_eq!(c.amount(&bot.usdc), 15 * USDC - 200 * CENT - 150 * CENT);
    let ix = c.replace_quotes_ix(bot.owner, bot.usdc, &[(m680, bot.yes, vec![bid(41, 5, 1)]), (m690, yes_690, vec![bid(31, 5, 1)])]);
    ok(&mut c, &ix);
    assert_eq!(levels(&c, &m680, Side::Buy), vec![(bot.owner, 41, 5, false)]);
    assert_eq!(levels(&c, &m690, Side::Buy), vec![(bot.owner, 31, 5, false)]);
    assert_eq!(c.amount(&bot.usdc), 15 * USDC - 205 * CENT - 155 * CENT);
    assert_eq!((book_accounts(&c, &m680).0, book_accounts(&c, &m690).0), (205 * CENT, 155 * CENT));
}

#[test]
fn replace_quotes_keeps_the_order_window_and_the_pause() {
    // D37, D46, D102, D68: the same window as Place order, by the chain's clock, and the pause stops it.
    for (at, refusal) in [
        (AT_9_30 - 1, Some(MeridianError::NotOpenYet)),
        (AT_9_30, None),
        (AT_4_00_PM - 6, None),
        (AT_4_00_PM - 5, Some(MeridianError::OrdersClosed)),
    ] {
        let (mut c, market, bot) = bot_on_meta_680();
        c.at(at);
        let ix = replace(&c, &market, &bot, vec![bid(40, 1, 1)]);
        match refusal {
            Some(e) => refused(&mut c, &ix, e),
            None => ok(&mut c, &ix),
        }
    }
    let (mut c, market, bot) = bot_on_meta_680();
    c.set_config(32, true);
    let ix = replace(&c, &market, &bot, vec![bid(40, 1, 1)]);
    refused(&mut c, &ix, MeridianError::Paused);

    // One listed market held during the day (D68) refuses the whole batch: the other book is untouched.
    let (mut c, m680, bot) = bot_on_meta_680();
    let (m690, yes_690) = second_market(&mut c, &bot.owner);
    c.set_status(&m690, MarketStatus::UnderReview);
    let ix = c.replace_quotes_ix(bot.owner, bot.usdc, &[(m680, bot.yes, vec![bid(40, 1, 1)]), (m690, yes_690, vec![bid(30, 1, 1)])]);
    refused(&mut c, &ix, MeridianError::OrdersClosed);
    assert!(levels(&c, &m680, Side::Buy).is_empty());
}

#[test]
fn the_maker_trades_from_its_own_accounts_only() {
    let (mut c, market, bot) = bot_on_meta_680();
    let carol = c.trader(&market, 20 * USDC);
    let ix = c.replace_quotes_ix(bot.owner, carol.usdc, &[(market, bot.yes, vec![bid(40, 1, 1)])]);
    refused(&mut c, &ix, MeridianError::NotYourAccount);
    let ix = c.replace_quotes_ix(bot.owner, bot.usdc, &[(market, carol.yes, vec![offer(70, 1, 1)])]);
    refused(&mut c, &ix, MeridianError::NotYourAccount);
    // D30's duplicate-account attack, with the book's own account as the maker's.
    let ix = c.replace_quotes_ix(bot.owner, pda(BOOK_USDC_SEED, &market), &[(market, bot.yes, vec![bid(40, 1, 1)])]);
    refused(&mut c, &ix, MeridianError::DuplicateAccount);
    let ix = c.replace_quotes_ix(bot.owner, bot.usdc, &[(market, pda(BOOK_YES_SEED, &market), vec![offer(70, 1, 1)])]);
    refused(&mut c, &ix, MeridianError::DuplicateAccount);
    assert_eq!(wallet(&c, &carol), (20 * USDC, 0, 0));
}

#[test]
fn each_books_accounts_must_be_that_markets() {
    let (mut c, m680, bot) = bot_on_meta_680();
    let (m690, yes_690) = second_market(&mut c, &bot.owner);
    let quotes = || vec![bid(40, 1, 1)];
    // The remaining accounts per book: 0 the market, 1 its book, 2 its USDC, 3 its Yes, 4 the Yes mint, 5 the maker's
    // Yes, after the 8 fixed accounts.
    let swap = |c: &Chain, slot: usize, key: Pubkey| {
        let mut ix = c.replace_quotes_ix(bot.owner, bot.usdc, &[(m680, bot.yes, quotes())]);
        ix.accounts[8 + slot].pubkey = key;
        ix
    };
    for (slot, key, label) in [
        (1, pda(BOOK_SEED, &m690), "META 690's book"),
        (2, pda(BOOK_USDC_SEED, &m690), "META 690's book USDC"),
        (3, pda(BOOK_YES_SEED, &m690), "META 690's book Yes"),
        (4, pda(YES_SEED, &m690), "META 690's Yes mint"),
    ] {
        let ix = swap(&c, slot, key);
        let r = c.run(&ix);
        assert!(refused_by_anchor(&r.program_result, ErrorCode::ConstraintSeeds), "{label}: {:?}", r.program_result);
    }
    // Accounts of the wrong kind: Config as the market, the vault as the book.
    let ix = swap(&c, 0, c.config);
    assert!(refused_by_anchor(&c.run(&ix).program_result, ErrorCode::AccountDiscriminatorMismatch));
    let ix = swap(&c, 1, pda(VAULT_SEED, &m680));
    assert!(refused_by_anchor(&c.run(&ix).program_result, ErrorCode::AccountOwnedByWrongProgram));
    // A book listed twice, and a book with an account missing.
    let ix = c.replace_quotes_ix(bot.owner, bot.usdc, &[(m680, bot.yes, quotes()), (m680, bot.yes, quotes())]);
    refused(&mut c, &ix, MeridianError::DuplicateAccount);
    let mut ix = c.replace_quotes_ix(bot.owner, bot.usdc, &[(m680, bot.yes, quotes()), (m690, yes_690, quotes())]);
    ix.accounts.pop();
    assert!(refused_by_anchor(&c.run(&ix).program_result, ErrorCode::AccountNotEnoughKeys));
    assert!(levels(&c, &m680, Side::Buy).is_empty() && levels(&c, &m690, Side::Buy).is_empty(), "nothing was placed");
}

#[test]
fn quotes_are_checked_as_orders_are() {
    let (mut c, market, bot) = bot_on_meta_680();
    for price in [0, 100] {
        let ix = replace(&c, &market, &bot, vec![bid(price, 1, 1)]);
        refused(&mut c, &ix, MeridianError::InvalidPrice);
    }
    let ix = replace(&c, &market, &bot, vec![bid(40, 0, 1)]);
    refused(&mut c, &ix, MeridianError::InvalidQuantity);
    // D101: two quotes with one ID; the old orders' IDs are free again once they're cancelled.
    let ix = replace(&c, &market, &bot, vec![bid(40, 1, 1), offer(70, 1, 1)]);
    refused(&mut c, &ix, MeridianError::DuplicateOrderId);
}

#[test]
fn the_books_check_runs_after_replace_quotes() {
    // D137: the bot's offer of 5 locks 5 Yes; with one of them missing from the book's Yes account, replacing the
    // offer, which moves no Yes, is refused rather than leave the book short.
    let (mut c, market, bot) = bot_on_meta_680();
    let ix = replace(&c, &market, &bot, vec![offer(66, 5, 1)]);
    ok(&mut c, &ix);
    c.set_amount(&pda(BOOK_YES_SEED, &market), 4);
    let ix = replace(&c, &market, &bot, vec![offer(67, 5, 1)]);
    refused(&mut c, &ix, MeridianError::BookShort);
}
