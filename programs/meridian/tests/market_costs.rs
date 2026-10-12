//! What a market costs (D50, M1.02): each account's size and deposit, and the compute of Create market, Mint pairs
//! and Redeem. Run with `-- --nocapture` to print them.
mod common;

use {
    common::{market_pda, meta_680, pda, rent, Chain, AT_9_00},
    meridian::{RedeemMode, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED, NO_SEED, VAULT_SEED, YES_SEED},
};

#[test]
fn what_a_market_costs() {
    let mut c = Chain::new(false);
    let ix = c.create_market_ix(c.operator, &meta_680());
    let create = c.run(&ix);
    assert!(create.program_result.is_ok(), "{:?}", create.program_result);
    let market = market_pda(&meta_680()).0;
    let mut kept = 0;
    let mut returned = 0;
    println!("account     bytes  deposit (lamports)");
    for (name, key, size, kept_for_good) in [
        ("market", market, 258, true),
        ("yes mint", pda(YES_SEED, &market), 412, true),
        ("no mint", pda(NO_SEED, &market), 410, true),
        ("vault", pda(VAULT_SEED, &market), 165, true),
        ("book", pda(BOOK_SEED, &market), 6_728, false),
        ("book usdc", pda(BOOK_USDC_SEED, &market), 165, false),
        ("book yes", pda(BOOK_YES_SEED, &market), 165, false),
    ] {
        let account = c.account(&key).unwrap();
        assert_eq!(account.lamports, rent(&c.m, account.data.len()), "{name}: exactly its deposit");
        assert_eq!(account.data.len(), size, "{name}: the size D139 and §5 state");
        println!("{name:<10} {:>6}  {:>10}", account.data.len(), account.lamports);
        if kept_for_good { kept += account.lamports } else { returned += account.lamports }
    }
    println!("kept for good {kept}; out and back {returned}");

    c.at(AT_9_00 + 600);
    let dave = c.trader(&market, 20_000_000);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    let mint = c.run(&ix);
    assert!(mint.program_result.is_ok(), "{:?}", mint.program_result);
    let ix = c.redeem_ix(&market, &dave, RedeemMode::Pairs, 4);
    let redeem = c.run(&ix);
    assert!(redeem.program_result.is_ok(), "{:?}", redeem.program_result);
    let ix = c.redeem_ix(&market, &dave, RedeemMode::Pairs, 6);
    let redeem_all = c.run(&ix);
    assert!(redeem_all.program_result.is_ok(), "{:?}", redeem_all.program_result);
    println!(
        "compute: create market {}; mint pairs {}; redeem pairs {}; redeem the last pairs, closing both accounts {}",
        create.compute_units_consumed, mint.compute_units_consumed, redeem.compute_units_consumed, redeem_all.compute_units_consumed
    );
    // Each fits the 200,000 compute units an instruction gets without asking for more, Create market included, so
    // the 8:30 job needs no larger budget (M1.02).
    for (name, r) in [("create market", &create), ("mint pairs", &mint), ("redeem", &redeem), ("redeem and close", &redeem_all)] {
        assert!(r.compute_units_consumed <= 200_000, "{name}: {}", r.compute_units_consumed);
    }
}
