//! Record close's and Settle's compute at their worst, measured in Mollusk as the other compute tests are (M1.01):
//! against the 200,000 compute units an instruction gets without asking for more. Record close is dearest when it
//! creates the record at an address that already holds lamports (three system calls instead of one). Run with
//! `-- --nocapture` for the table.
mod common;

use {
    anchor_lang::{prelude::Pubkey, solana_program::instruction::Instruction},
    common::{close_pda, crafted, meta_680, pyth, Chain, AT_4_00_PM, LEGACY_RECEIVER, UPGRADED_RECEIVER},
    meridian::CreateMarketArgs,
    solana_account::Account,
};

const DEFAULT_BUDGET: u64 = 200_000;

fn run(c: &mut Chain, ix: &Instruction) -> u64 {
    let r = c.run(ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    r.compute_units_consumed
}

fn chain() -> (Chain, Pubkey) {
    let mut c = Chain::new(false);
    c.use_pyth(vec![LEGACY_RECEIVER, UPGRADED_RECEIVER], 1);
    let recorder = Pubkey::new_unique();
    c.set(recorder, Account { lamports: 1_000_000_000, ..Account::default() });
    (c, recorder)
}

#[test]
fn record_close_and_settle_fit_the_default_budget() {
    let mut rows = vec![];

    // Record close: the day's first price, then a later one replacing it.
    let (mut c, recorder) = chain();
    let market = c.create(&meta_680());
    let early = crafted("meta_close_20261008_upgraded", |m| m.publish_time = AT_4_00_PM - 3);
    c.set(early.0, early.1);
    let (price, account) = pyth("meta_close_20261008_upgraded");
    c.set(price, account);
    c.at(AT_4_00_PM + 2);
    let ix = c.record_close_ix(&market, early.0, recorder);
    rows.push(("Record close: the first price of the day", run(&mut c, &ix)));
    let ix = c.record_close_ix(&market, price, recorder);
    rows.push(("Record close: a later price replaces it", run(&mut c, &ix)));

    // Record close at an address someone sent lamports to first.
    let (mut c, recorder) = chain();
    let market = c.create(&meta_680());
    c.set(close_pda("META", 20_261_008).0, Account { lamports: 1, ..Account::default() });
    let (price, account) = pyth("meta_close_20261008_upgraded");
    c.set(price, account);
    c.at(AT_4_00_PM + 2);
    let ix = c.record_close_ix(&market, price, recorder);
    rows.push(("Record close: the first price, address pre-funded", run(&mut c, &ix)));

    // Settle: Yes, No and a hold on the band, from the real record; and a hold for no price.
    let operator = c.operator;
    let strikes = [("Settle: Yes", 70_000), ("Settle: No", 73_000), ("Settle: held, band on the strike", 72_070)];
    let markets: Vec<_> = strikes.iter().map(|(_, s)| c.create(&CreateMarketArgs { strike_cents: *s, ..meta_680() })).collect();
    c.at(AT_4_00_PM + 60);
    for ((label, _), market) in strikes.iter().zip(&markets) {
        let ix = c.settle_ix(market, operator);
        rows.push((*label, run(&mut c, &ix)));
    }
    let aapl = c.create(&CreateMarketArgs { ticker: "AAPL".into(), strike_cents: 34_000, ..meta_680() });
    c.at(AT_4_00_PM + 15 * 60);
    let ix = c.settle_ix(&aapl, operator);
    rows.push(("Settle: held, no price", run(&mut c, &ix)));

    println!("{:<52} {:>8}", "instruction", "CU");
    for (label, cu) in &rows {
        println!("{label:<52} {cu:>8}");
        assert!(*cu <= DEFAULT_BUDGET, "{label}: {cu} CU");
    }
}
