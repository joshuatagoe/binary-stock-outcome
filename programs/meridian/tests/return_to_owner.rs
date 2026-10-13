//! Return to owner (ARCHITECTURE.md §6, instruction 16; D99, D142, D144) in Mollusk, on META $680 created by the
//! program: anyone sends it, and it pays the owner's whole balance in the book (USDC, Yes, and No released from paired
//! offers) to the owner's own token accounts and nowhere else. The book's checks run inside the program after it (D137).
mod common;

use {
    anchor_lang::{error::ErrorCode, prelude::Pubkey, solana_program::instruction::Instruction},
    common::{pda, refused_by_anchor, refused_with, Chain, Trader, AT_10_16, AT_4_00_PM},
    meridian::{
        errors::MeridianError, BuyNoArgs, CreateMarketArgs, MarketStatus, OrderKind, PlaceOrderArgs, Side, BOOK_NO_SEED,
        BOOK_USDC_SEED, BOOK_YES_SEED, TRADER_CAPACITY,
    },
    mollusk_svm::result::ProgramResult,
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

fn wallet(c: &Chain, t: &Trader) -> (u64, u64, u64) {
    (c.amount(&t.usdc), c.amount(&t.yes), c.amount(&t.no))
}

fn book_accounts(c: &Chain, market: &Pubkey) -> (u64, u64, u64) {
    (c.amount(&pda(BOOK_USDC_SEED, market)), c.amount(&pda(BOOK_YES_SEED, market)), c.amount(&pda(BOOK_NO_SEED, market)))
}

/// META $680 at 10:16 (§3): Dave mints 10 pairs and offers the 10 Yes at 65¢, and Alice's Buy Yes of 10 at up to 66¢
/// takes them, so 6.50 waits in the book for Dave (§5). Returns the chain, the market, Dave and Alice.
fn after_alices_buy() -> (Chain, Pubkey, Trader, Trader) {
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_10_16);
    let dave = c.trader(&market, 20 * USDC);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    ok(&mut c, &ix);
    let ix = c.place_order_ix(&market, &dave, order(Side::Sell, OrderKind::Limit, 65, 10, 1));
    ok(&mut c, &ix);
    let alice = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &alice, order(Side::Buy, OrderKind::Market, 66, 10, 1));
    ok(&mut c, &ix);
    (c, market, dave, alice)
}

#[test]
fn anyone_returns_daves_6_50_to_his_wallet_and_a_repeat_finds_nothing() {
    // packages/golden/returns.json: "dave-after-alice-buy", then "repeat-finds-zero".
    let golden: Value = serde_json::from_str(RETURNS).unwrap();
    let rows = golden["returnToOwner"].as_array().unwrap();
    let n = |v: &Value| v.as_u64().unwrap();
    let (mut c, market, dave, _) = after_alices_buy();
    let first = &rows[0];
    assert_eq!(first["id"], "dave-after-alice-buy");
    let before = &first["before"];
    assert_eq!((c.amount(&dave.usdc), c.amount(&dave.yes)), (n(&before["wallet"]["usdc"]), n(&before["wallet"]["yes"])));
    let (usdc, yes, _) = c.free(&market, &dave.owner);
    assert_eq!((usdc, yes), (n(&before["bookFree"]["usdc"]), n(&before["bookFree"]["yes"])));

    // The instruction has no signer: whoever pays the fee sends it (D99).
    let ix = c.return_to_owner_ix(&market, &dave);
    assert!(ix.accounts.iter().all(|m| !m.is_signer), "no account signs");
    ok(&mut c, &ix);
    let after = &first["after"];
    assert_eq!((c.amount(&dave.usdc), c.amount(&dave.yes)), (n(&after["wallet"]["usdc"]), n(&after["wallet"]["yes"])));
    let (usdc, yes, no) = c.free(&market, &dave.owner);
    assert_eq!((usdc, yes, no), (n(&after["bookFree"]["usdc"]), n(&after["bookFree"]["yes"]), 0));
    assert_eq!(book_accounts(&c, &market), (0, 0, 0), "nothing else was in the book");

    // A return moves the whole balance, so a repeat finds nothing to pay (§3's guards) and changes nothing.
    let repeat = &rows[1];
    assert_eq!(repeat["id"], "repeat-finds-zero");
    refused(&mut c, &ix, MeridianError::InvalidQuantity);
    assert_eq!((c.amount(&dave.usdc), c.amount(&dave.yes)), (n(&repeat["after"]["wallet"]["usdc"]), n(&repeat["after"]["wallet"]["yes"])));
}

/// Bob holds all three balances in the book: 3 Yes from his bid of 3 at 40¢ that Eve sold into, then 2.68 USDC and 4 No
/// from his Buy No limit order of 10 at 33¢, whose paired offer at 67¢ Carol bought 4 of (D142). His 6 unsold pairs
/// still rest. Returns the chain, the market and Bob.
fn bob_with_three_balances() -> (Chain, Pubkey, Trader) {
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_10_16);
    let bob = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &bob, order(Side::Buy, OrderKind::Limit, 40, 3, 1));
    ok(&mut c, &ix);
    let eve = c.trader(&market, 20 * USDC);
    let ix = c.mint_pairs_ix(&market, &eve, 3);
    ok(&mut c, &ix);
    let ix = c.place_order_ix(&market, &eve, order(Side::Sell, OrderKind::Market, 40, 3, 1));
    ok(&mut c, &ix);
    let ix = c.buy_no_ix(&market, &bob, BuyNoArgs { kind: OrderKind::Limit, price: 33, quantity: 10, order_id: 2 });
    ok(&mut c, &ix);
    let carol = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &carol, order(Side::Buy, OrderKind::Market, 67, 4, 1));
    ok(&mut c, &ix);
    (c, market, bob)
}

#[test]
fn a_return_pays_usdc_yes_and_the_no_released_from_a_paired_offer() {
    let (mut c, market, bob) = bob_with_three_balances();
    assert_eq!(c.free(&market, &bob.owner), (268 * CENT, 3, 4));
    let before = wallet(&c, &bob);
    assert_eq!(before, (20 * USDC - 120 * CENT - 10 * USDC, 0, 0), "1.20 locked by his bid, 10.00 for his 10 pairs");
    let ix = c.return_to_owner_ix(&market, &bob);
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (before.0 + 268 * CENT, 3, 4), "D144: USDC, Yes and No, each to its own account");
    assert_eq!(c.free(&market, &bob.owner), (0, 0, 0));
    let entry = *c.book(&market).trader(&bob.owner).unwrap();
    assert_eq!(entry.open_orders, 1, "his paired offer of the other 6 still rests");
    assert_eq!(book_accounts(&c, &market), (0, 6, 6), "only the paired offer's 6 Yes and 6 No are left in the book");
}

#[test]
fn a_return_pays_only_the_balances_there_are() {
    // After Alice's buy, Dave has only USDC waiting: his Yes and No accounts are not touched, so a closed one doesn't
    // block the return (§3: the backend re-creates only an account a return needs).
    let (mut c, market, dave, _) = after_alices_buy();
    let closed = Trader { yes: Pubkey::new_unique(), no: Pubkey::new_unique(), ..dave };
    let ix = c.return_to_owner_ix(&market, &closed);
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &dave), (165 * USDC / 10, 0, 10));
}

#[test]
fn a_traders_entry_is_free_once_everything_is_returned() {
    // D107, AI_USAGE 34: 63 traders rest a bid each, and Bob's Buy No limit of 4 at 33¢ takes the 64th entry with a
    // paired offer at 67¢. Carol buys all 4, which leaves Bob 2.68 USDC and 4 No and no orders: the table is full and
    // his entry, holding No, can't be reused. Once Return to owner pays him, it can.
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_10_16);
    for i in 0..TRADER_CAPACITY - 1 {
        let t = c.trader(&market, 20 * USDC);
        let ix = c.place_order_ix(&market, &t, order(Side::Buy, OrderKind::Limit, 1 + (i % 30) as u8, 1, 1));
        ok(&mut c, &ix);
    }
    let bob = c.trader(&market, 20 * USDC);
    let ix = c.buy_no_ix(&market, &bob, BuyNoArgs { kind: OrderKind::Limit, price: 33, quantity: 4, order_id: 1 });
    ok(&mut c, &ix);
    let carol = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &carol, order(Side::Buy, OrderKind::Market, 67, 4, 1));
    ok(&mut c, &ix);
    let entry = *c.book(&market).trader(&bob.owner).unwrap();
    assert_eq!((entry.free_usdc, entry.free_yes, entry.free_no, entry.open_orders), (268 * CENT, 0, 4, 0));

    let newcomer = c.trader(&market, 20 * USDC);
    let rest = c.place_order_ix(&market, &newcomer, order(Side::Buy, OrderKind::Limit, 50, 1, 1));
    refused(&mut c, &rest, MeridianError::BookFull);
    let ix = c.return_to_owner_ix(&market, &bob);
    ok(&mut c, &ix);
    assert_eq!(wallet(&c, &bob), (20 * USDC - 4 * USDC + 268 * CENT, 0, 4));
    ok(&mut c, &rest);
    let book = c.book(&market);
    assert!(book.trader(&bob.owner).is_none(), "his entry now belongs to the newcomer");
    assert_eq!(book.trader(&newcomer.owner).unwrap().open_orders, 1);
}

#[test]
fn a_return_pays_only_the_owners_own_accounts() {
    let (mut c, market, bob) = bob_with_three_balances();
    let eve = c.trader(&market, 0);
    for (label, t) in [
        ("Eve's USDC account", Trader { usdc: eve.usdc, ..bob }),
        ("Eve's Yes account", Trader { yes: eve.yes, ..bob }),
        ("Eve's No account", Trader { no: eve.no, ..bob }),
    ] {
        let ix = c.return_to_owner_ix(&market, &t);
        let r = c.run(&ix);
        assert!(refused_with(&r.program_result, MeridianError::NotYourAccount), "{label}: {:?}", r.program_result);
    }
    // Naming Eve as the owner, with Bob's accounts, finds no balance of hers.
    let ix = c.return_to_owner_ix(&market, &Trader { owner: eve.owner, ..bob });
    refused(&mut c, &ix, MeridianError::InvalidQuantity);
    assert_eq!(c.free(&market, &bob.owner), (268 * CENT, 3, 4), "Bob's balance is untouched");
}

#[test]
fn swapped_or_duplicate_accounts_are_refused() {
    let (mut c, market, bob) = bob_with_three_balances();
    // The Yes and No accounts swapped: both are Bob's, so the token program refuses paying Yes into a No account
    // (Token-2022's MintMismatch, 3).
    let swapped = Trader { yes: bob.no, no: bob.yes, ..bob };
    let ix = c.return_to_owner_ix(&market, &swapped);
    let r = c.run(&ix);
    assert!(matches!(&r.program_result, ProgramResult::Failure(e) if format!("{e:?}") == "Custom(3)"), "{:?}", r.program_result);
    // One account passed twice, or one of the book's own accounts passed as the owner's (D30).
    for (label, t) in [
        ("his Yes account as his No account", Trader { no: bob.yes, ..bob }),
        ("his USDC account as his Yes account", Trader { yes: bob.usdc, ..bob }),
        ("the book's USDC account as his", Trader { usdc: pda(BOOK_USDC_SEED, &market), ..bob }),
        ("the book's No account as his", Trader { no: pda(BOOK_NO_SEED, &market), ..bob }),
    ] {
        let ix = c.return_to_owner_ix(&market, &t);
        let r = c.run(&ix);
        assert!(refused_with(&r.program_result, MeridianError::DuplicateAccount), "{label}: {:?}", r.program_result);
    }
    // Another market's book accounts are at the wrong addresses.
    c.at(AT_10_16 - 3 * 3600);
    let other = CreateMarketArgs { strike_cents: 69_000, ..common::meta_680() };
    let ix = c.create_market_ix(c.operator, &other);
    ok(&mut c, &ix);
    c.at(AT_10_16);
    let other = common::market_pda(&other).0;
    for seed in [BOOK_USDC_SEED, BOOK_YES_SEED, BOOK_NO_SEED] {
        let mut ix = c.return_to_owner_ix(&market, &bob);
        let ours = pda(seed, &market);
        ix.accounts.iter_mut().find(|m| m.pubkey == ours).unwrap().pubkey = pda(seed, &other);
        assert!(refused_by_anchor(&c.run(&ix).program_result, ErrorCode::ConstraintSeeds));
    }
    assert_eq!(c.free(&market, &bob.owner), (268 * CENT, 3, 4), "nothing moved");
}

#[test]
fn an_empty_balance_is_refused() {
    let (mut c, market, dave, alice) = after_alices_buy();
    // Alice was the taker: she never entered the book (§5).
    let ix = c.return_to_owner_ix(&market, &alice);
    refused(&mut c, &ix, MeridianError::InvalidQuantity);
    // Carol has an entry, with a resting bid and nothing free.
    let carol = c.trader(&market, 20 * USDC);
    let ix = c.place_order_ix(&market, &carol, order(Side::Buy, OrderKind::Limit, 60, 10, 1));
    ok(&mut c, &ix);
    let ix = c.return_to_owner_ix(&market, &carol);
    refused(&mut c, &ix, MeridianError::InvalidQuantity);
    assert_eq!(c.amount(&carol.usdc), 14 * USDC);
    let _ = dave;
}

#[test]
fn a_return_works_while_paused_after_the_close_and_after_settlement() {
    // D68, D99: a return is a way out, so neither the pause nor the clock nor the result stops it.
    for (label, paused, at, status) in [
        ("paused", true, AT_10_16, MarketStatus::Trading),
        ("after the close", false, AT_4_00_PM + 60, MarketStatus::Trading),
        ("under review", false, AT_4_00_PM + 600, MarketStatus::UnderReview),
        ("settled", true, AT_4_00_PM + 3600, MarketStatus::Settled),
    ] {
        let (mut c, market, dave, _) = after_alices_buy();
        c.set_config(32, paused);
        c.at(at);
        c.set_status(&market, status);
        let ix = c.return_to_owner_ix(&market, &dave);
        let r = c.run(&ix);
        assert!(r.program_result.is_ok(), "{label}: {:?}", r.program_result);
        assert_eq!(c.amount(&dave.usdc), 165 * USDC / 10, "{label}");
    }
}

#[test]
fn the_books_checks_run_after_a_return() {
    // D137: Bob's return of USDC, Yes and No leaves the book holding only his paired offer's 6 Yes and 6 No. With one
    // of either missing, the return is refused rather than leave the book short.
    for seed in [BOOK_YES_SEED, BOOK_NO_SEED] {
        let (mut c, market, bob) = bob_with_three_balances();
        let key = pda(seed, &market);
        let held = c.amount(&key);
        c.set_amount(&key, held - 1);
        let ix = c.return_to_owner_ix(&market, &bob);
        refused(&mut c, &ix, MeridianError::BookShort);
    }
}
