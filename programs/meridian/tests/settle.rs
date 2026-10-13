//! Settle (ARCHITECTURE.md §4 "Who may do what, and when", "Settlement numbers", §6 instruction 19; D1, D26, D58, D59,
//! D83, D105, D106, A4) in Mollusk, from closes recorded by Record close out of real Pyth price accounts saved from
//! devnet, and crafted variants of them for exact ties. The whole band on one side of the strike settles the market;
//! a band on the strike, or no recorded price 15 minutes after the close, holds it Under review. Only the operator
//! settles for 24 hours after the close, then anyone. A result is written once. Settle moves no money: the vault's rule
//! is checked after each one (D64).
mod common;

use {
    anchor_lang::{prelude::Pubkey, solana_program::instruction::Instruction, AccountSerialize},
    common::{close_pda, crafted, meta_680, pyth, refused_with, Chain, Trader, AT_10_16, AT_4_00_PM, LEGACY_RECEIVER, UPGRADED_RECEIVER},
    meridian::{
        errors::MeridianError, CreateMarketArgs, HoldReason, Market, MarketStatus, Outcome, RecordedClose, SettledBy,
    },
    mollusk_svm::result::ProgramResult,
    solana_account::Account,
};

const USDC: u64 = 1_000_000;
const HOUR: i64 = 3_600;
const DAY: i64 = 24 * HOUR;

struct Day {
    c: Chain,
    recorder: Pubkey,
    /// Someone who is neither the operator nor the admin.
    stranger: Pubkey,
}

/// Config with both receivers, the real feeds and META's strike step in cents, at 8:30 on 2026-10-08.
fn day(meta_step_cents: u32) -> Day {
    let mut c = Chain::new(false);
    c.use_pyth(vec![LEGACY_RECEIVER, UPGRADED_RECEIVER], meta_step_cents);
    let (recorder, stranger) = (Pubkey::new_unique(), Pubkey::new_unique());
    for key in [recorder, stranger] {
        c.set(key, Account { lamports: 1_000_000_000, ..Account::default() });
    }
    Day { c, recorder, stranger }
}

fn meta(strike_cents: u64) -> CreateMarketArgs {
    CreateMarketArgs { strike_cents, ..meta_680() }
}

impl Day {
    fn create(&mut self, strike_cents: u64) -> Pubkey {
        self.c.create(&meta(strike_cents))
    }

    fn post(&mut self, (key, account): (Pubkey, Account)) -> Pubkey {
        self.c.set(key, account);
        key
    }

    /// Records `price` through `market` at the chain's time.
    fn record(&mut self, market: &Pubkey, price: Pubkey) {
        let ix = self.c.record_close_ix(market, price, self.recorder);
        let r = self.c.run(&ix);
        assert!(r.program_result.is_ok(), "record: {:?}", r.program_result);
    }

    /// Records META's real 4:00:00 PM close of 2026-10-08, 720.73285 ± 0.19645, at 4:00:30.
    fn record_real_close(&mut self, market: &Pubkey) {
        let price = self.post(pyth("meta_close_20261008_upgraded"));
        self.c.at(AT_4_00_PM + 30);
        self.record(market, price);
    }

    fn settle(&mut self, market: &Pubkey, settler: Pubkey) -> ProgramResult {
        let ix = self.c.settle_ix(market, settler);
        let r = self.c.run(&ix);
        if r.program_result.is_ok() {
            self.c.assert_vault(market);
        }
        r.program_result
    }

    fn settle_ok(&mut self, market: &Pubkey) -> Market {
        let operator = self.c.operator;
        let r = self.settle(market, operator);
        assert!(r.is_ok(), "settle: {r:?}");
        self.c.market(market)
    }

    fn refused(&mut self, market: &Pubkey, settler: Pubkey, error: MeridianError) {
        let r = self.settle(market, settler);
        assert!(refused_with(&r, error), "expected {error:?}: {r:?}");
    }

    fn record_state(&self) -> RecordedClose {
        self.c.recorded_close("META", 20_261_008).expect("META's record")
    }
}

fn result(m: &Market) -> (MarketStatus, Outcome, HoldReason, SettledBy) {
    (m.status, m.outcome, m.hold, m.settled_by)
}

fn order(side: meridian::Side, kind: meridian::OrderKind, price: u8, quantity: u32, order_id: u64) -> meridian::PlaceOrderArgs {
    meridian::PlaceOrderArgs { side, kind, price, quantity, order_id }
}

#[test]
fn yes_wins_when_the_whole_band_is_at_or_above_the_strike() {
    // META closed at 720.73285 ± 0.19645 on 2026-10-08: the band, 720.53640 to 720.92930, is above $680 (D26).
    // Dave mints 10 pairs and sells 10 Yes to Alice; settling moves no money and leaves the vault's rule holding.
    let mut d = day(1000);
    let market = d.create(68_000);
    d.c.at(AT_10_16);
    let dave = d.c.trader(&market, 20 * USDC);
    let ix = d.c.mint_pairs_ix(&market, &dave, 10);
    assert!(d.c.run(&ix).program_result.is_ok());
    let ix = d.c.place_order_ix(&market, &dave, order(meridian::Side::Sell, meridian::OrderKind::Limit, 65, 10, 1));
    assert!(d.c.run(&ix).program_result.is_ok());
    let alice: Trader = d.c.trader(&market, 20 * USDC);
    let ix = d.c.place_order_ix(&market, &alice, order(meridian::Side::Buy, meridian::OrderKind::Market, 66, 10, 1));
    assert!(d.c.run(&ix).program_result.is_ok());
    let vault = common::pda(meridian::VAULT_SEED, &market);
    let before = (d.c.amount(&vault), d.c.market(&market).owed, d.c.amount(&alice.yes), d.c.amount(&dave.no));
    assert_eq!(before, (10 * USDC, 10, 10, 10));

    d.record_real_close(&market);
    d.c.at(AT_4_00_PM + 60);
    let m = d.settle_ok(&market);
    assert_eq!(result(&m), (MarketStatus::Settled, Outcome::Yes, HoldReason::None, SettledBy::Oracle));
    assert_eq!((m.price, m.conf, m.expo, m.publish_time), (72_073_285, 19_645, -5, AT_4_00_PM), "the evidence it settled on");
    assert_eq!((d.c.amount(&vault), m.owed, d.c.amount(&alice.yes), d.c.amount(&dave.no)), before, "settling moves no money");
    assert!(d.record_state().frozen, "the record freezes at the first settle on the stock (D105)");
}

#[test]
fn no_wins_when_the_whole_band_is_below_the_strike() {
    let mut d = day(1000);
    let market = d.create(73_000);
    d.record_real_close(&market);
    d.c.at(AT_4_00_PM + 60);
    let m = d.settle_ok(&market);
    assert_eq!(result(&m), (MarketStatus::Settled, Outcome::No, HoldReason::None, SettledBy::Oracle));
    assert_eq!((m.price, m.conf, m.publish_time), (72_073_285, 19_645, AT_4_00_PM));
}

#[test]
fn the_real_bands_edges_at_one_cent_strikes() {
    // With a 1-cent strike step (D49 lets the step be set per stock), strikes sit right at the band's edges:
    // 720.53640 to 720.92930. The whole band at or above $720.53 pays Yes, but not $720.54; the whole band below
    // $720.93 pays No, but not $720.92. In between, the band is on the strike and the market is held (D59).
    let mut d = day(1);
    let strikes = [(72_053, Some(Outcome::Yes)), (72_054, None), (72_073, None), (72_092, None), (72_093, Some(Outcome::No))];
    let markets: Vec<Pubkey> = strikes.iter().map(|(s, _)| d.create(*s)).collect();
    d.record_real_close(&markets[0]);
    d.c.at(AT_4_00_PM + 60);
    for (market, (strike, expected)) in markets.iter().zip(strikes) {
        let m = d.settle_ok(market);
        match expected {
            Some(outcome) => assert_eq!(result(&m), (MarketStatus::Settled, outcome, HoldReason::None, SettledBy::Oracle), "{strike}"),
            None => assert_eq!(result(&m), (MarketStatus::UnderReview, Outcome::None, HoldReason::BandOnStrike, SettledBy::None), "{strike}"),
        }
    }
}

#[test]
fn ties_scale_the_strike_to_pyths_exponent_and_never_round_pyths_price() {
    // A4: the strike, $680, becomes 68,000,000 at exponent -5. D1: at or above the strike pays Yes.
    let cases: [(&str, i64, u64, i32, Option<Outcome>); 10] = [
        ("680.10 ± 0.10: the band's low end is the strike", 68_010_000, 10_000, -5, Some(Outcome::Yes)),
        ("680.09999 ± 0.10: the low end is just under", 68_009_999, 10_000, -5, None),
        ("679.90 ± 0.10: the band's high end is the strike", 67_990_000, 10_000, -5, None),
        ("679.89999 ± 0.10: the high end is just under", 67_989_999, 10_000, -5, Some(Outcome::No)),
        ("exactly 680.00000, no band", 68_000_000, 0, -5, Some(Outcome::Yes)),
        ("679.99600, which rounds to 680.00", 67_999_600, 0, -5, Some(Outcome::No)),
        ("680.00000000 at exponent -8", 68_000_000_000, 0, -8, Some(Outcome::Yes)),
        ("679.99999999 at exponent -8", 67_999_999_999, 0, -8, Some(Outcome::No)),
        ("680.00 at exponent -2", 68_000, 0, -2, Some(Outcome::Yes)),
        ("679.99 at exponent -2", 67_999, 0, -2, Some(Outcome::No)),
    ];
    for (label, price, conf, expo, expected) in cases {
        let mut d = day(1000);
        let market = d.create(68_000);
        let key = d.post(crafted("meta_close_20261008_upgraded", |m| {
            m.price = price;
            m.conf = conf;
            m.exponent = expo;
        }));
        d.c.at(AT_4_00_PM + 30);
        d.record(&market, key);
        let m = d.settle_ok(&market);
        match expected {
            Some(outcome) => assert_eq!((m.status, m.outcome), (MarketStatus::Settled, outcome), "{label}"),
            None => assert_eq!((m.status, m.hold), (MarketStatus::UnderReview, HoldReason::BandOnStrike), "{label}"),
        }
    }
}

#[test]
fn a_band_on_the_strike_holds_only_that_market_and_freezes_the_record() {
    // D59: META $720.70 is held; the stock's other strikes settle normally, on the same frozen price (D105).
    let mut d = day(1);
    let held = d.create(72_070);
    let below = d.create(70_000);
    let early = d.post(crafted("meta_close_20261008_upgraded", |m| m.publish_time = AT_4_00_PM - 2));
    d.c.at(AT_4_00_PM + 20);
    d.record(&held, early);
    d.c.at(AT_4_00_PM + 60);
    let m = d.settle_ok(&held);
    assert_eq!(result(&m), (MarketStatus::UnderReview, Outcome::None, HoldReason::BandOnStrike, SettledBy::None));
    assert!(d.record_state().frozen, "the hold read the record, so it freezes: the override's reference stays put (D104)");

    let later = d.post(pyth("meta_close_20261008_upgraded"));
    let ix = d.c.record_close_ix(&held, later, d.recorder);
    assert!(refused_with(&d.c.run(&ix).program_result, MeridianError::RecordFrozen));
    let m = d.settle_ok(&below);
    assert_eq!((m.status, m.outcome, m.publish_time), (MarketStatus::Settled, Outcome::Yes, AT_4_00_PM - 2), "the frozen price");
}

#[test]
fn every_strike_settles_on_the_price_frozen_at_the_first_settle() {
    // D105: the bot records a price 3 s before the close and settles $680 on it. The 4:00:00 PM price posted after
    // that can't replace the record, so $730 settles on the same price.
    let mut d = day(1000);
    let m680 = d.create(68_000);
    let m730 = d.create(73_000);
    let early = d.post(crafted("meta_close_20261008_upgraded", |m| {
        m.publish_time = AT_4_00_PM - 3;
        m.price = 72_050_000;
    }));
    d.c.at(AT_4_00_PM + 10);
    d.record(&m680, early);
    d.c.at(AT_4_00_PM + 60);
    assert_eq!(d.settle_ok(&m680).price, 72_050_000);
    let at_close = d.post(pyth("meta_close_20261008_upgraded"));
    let ix = d.c.record_close_ix(&m730, at_close, d.recorder);
    assert!(refused_with(&d.c.run(&ix).program_result, MeridianError::RecordFrozen), "the record froze at the first settle");
    let record = d.record_state();
    assert_eq!((record.price, record.publish_time, record.price_account), (72_050_000, AT_4_00_PM - 3, early));
    let m = d.settle_ok(&m730);
    assert_eq!((m.outcome, m.price, m.publish_time), (Outcome::No, 72_050_000, AT_4_00_PM - 3));
}

#[test]
fn with_no_price_recorded_by_15_minutes_after_the_close_the_market_is_held() {
    // D83, D105: "Under review: no price". Before then, settle waits for a record.
    let mut d = day(1000);
    let market = d.create(68_000);
    for at in [AT_4_00_PM + 1, AT_4_00_PM + 5 * 60, AT_4_00_PM + 15 * 60 - 1] {
        d.c.at(at);
        let operator = d.c.operator;
        d.refused(&market, operator, MeridianError::BeforeClose);
    }
    d.c.at(AT_4_00_PM + 15 * 60);
    let m = d.settle_ok(&market);
    assert_eq!(result(&m), (MarketStatus::UnderReview, Outcome::None, HoldReason::NoPrice, SettledBy::None));
    assert!(d.c.recorded_close("META", 20_261_008).is_none());
}

#[test]
fn a_few_lamports_at_the_record_address_are_not_a_record() {
    // Anyone can send lamports to the record's address before it exists; that is still no price.
    let mut d = day(1000);
    let market = d.create(68_000);
    d.c.set(close_pda("META", 20_261_008).0, Account { lamports: 5_000, ..Account::default() });
    d.c.at(AT_4_00_PM + 60);
    let operator = d.c.operator;
    d.refused(&market, operator, MeridianError::BeforeClose);
    d.c.at(AT_4_00_PM + 15 * 60);
    assert_eq!(d.settle_ok(&market).hold, HoldReason::NoPrice);
}

#[test]
fn settling_before_the_close_is_refused() {
    // D57: the chain's clock must have passed the stored close. A record can't exist before then, so one is written
    // straight into the record's address to leave the clock as the only guard.
    let mut d = day(1000);
    let market = d.create(68_000);
    let (address, bump) = close_pda("META", 20_261_008);
    let mut ticker = [0u8; 8];
    ticker[..4].copy_from_slice(b"META");
    let record = RecordedClose {
        ticker,
        day: 20_261_008,
        price: 72_073_285,
        conf: 19_645,
        expo: -5,
        publish_time: AT_4_00_PM,
        price_account: Pubkey::new_unique(),
        recorder: d.recorder,
        recorded_slot: 0,
        frozen: false,
        bump,
        _reserved: [0; 32],
    };
    let mut data = Vec::new();
    record.try_serialize(&mut data).unwrap();
    let lamports = common::rent(&d.c.m, data.len());
    d.c.set(address, Account { lamports, data, owner: meridian::ID, executable: false, rent_epoch: 0 });
    for at in [AT_10_16, AT_4_00_PM - 5, AT_4_00_PM - 1, AT_4_00_PM] {
        d.c.at(at);
        let operator = d.c.operator;
        d.refused(&market, operator, MeridianError::BeforeClose);
    }
    assert_eq!(d.c.market(&market).status, MarketStatus::Trading);
    d.c.at(AT_4_00_PM + 1);
    assert_eq!(d.settle_ok(&market).outcome, Outcome::Yes);
}

#[test]
fn only_the_operator_settles_for_24_hours_then_anyone() {
    // D58: anyone else, the admin included, is refused until 24 hours after the close; then anyone may.
    let mut d = day(1000);
    let market = d.create(68_000);
    d.record_real_close(&market);
    let (stranger, admin) = (d.stranger, d.c.admin);
    for (at, who) in [(AT_4_00_PM + 60, stranger), (AT_4_00_PM + 60, admin), (AT_4_00_PM + DAY - 1, stranger)] {
        d.c.at(at);
        d.refused(&market, who, MeridianError::NotOperator);
    }
    assert_eq!(d.c.market(&market).status, MarketStatus::Trading);
    d.c.at(AT_4_00_PM + DAY);
    assert!(d.settle(&market, stranger).is_ok());
    assert_eq!(d.c.market(&market).outcome, Outcome::Yes);

    // The same holds for a hold with no price.
    let mut d = day(1000);
    let market = d.create(68_000);
    let stranger = d.stranger;
    d.c.at(AT_4_00_PM + 15 * 60);
    d.refused(&market, stranger, MeridianError::NotOperator);
    d.c.at(AT_4_00_PM + DAY);
    assert!(d.settle(&market, stranger).is_ok());
    assert_eq!(d.c.market(&market).hold, HoldReason::NoPrice);
}

#[test]
fn settling_works_while_paused() {
    // D68: pause stops minting and new orders only.
    let mut d = day(1000);
    let market = d.create(68_000);
    d.record_real_close(&market);
    let mut config = d.c.config_state();
    config.paused = true;
    d.c.set_config_state(&config);
    d.c.at(AT_4_00_PM + 60);
    assert_eq!(d.settle_ok(&market).outcome, Outcome::Yes);
}

#[test]
fn a_result_is_written_once() {
    // D2: a settled result never changes. Settling again is refused, by the operator or, later, by anyone.
    let mut d = day(1000);
    let market = d.create(68_000);
    d.record_real_close(&market);
    d.c.at(AT_4_00_PM + 60);
    d.settle_ok(&market);
    let settled = d.c.account(&market).unwrap().data.clone();
    let operator = d.c.operator;
    d.refused(&market, operator, MeridianError::AlreadySettled);
    d.c.at(AT_4_00_PM + 2 * DAY);
    let stranger = d.stranger;
    d.refused(&market, stranger, MeridianError::AlreadySettled);
    assert_eq!(d.c.account(&market).unwrap().data, settled, "the market is unchanged");

    // A held market is left for the admin's override and the backstops (D63, D68), which M3-b builds: settling it
    // again changes nothing.
    let mut d = day(1000);
    let market = d.create(68_000);
    d.c.at(AT_4_00_PM + 15 * 60);
    d.settle_ok(&market);
    let held = d.c.account(&market).unwrap().data.clone();
    let operator = d.c.operator;
    let r = d.settle(&market, operator);
    assert!(r.is_err(), "{r:?}");
    assert_eq!(d.c.account(&market).unwrap().data, held);
}

#[test]
fn a_record_whose_band_is_wider_than_the_limit_now_is_refused() {
    // D106: Settle checks the band against Config's limit again. If the admin has narrowed it below the recorded band
    // (2.73 bps here) since the record was taken, settle is refused and the record stays open to a better price.
    let mut d = day(1000);
    let market = d.create(68_000);
    d.record_real_close(&market);
    let mut config = d.c.config_state();
    config.thresholds.max_band_bps = 2;
    d.c.set_config_state(&config);
    d.c.at(AT_4_00_PM + 60);
    let operator = d.c.operator;
    d.refused(&market, operator, MeridianError::BandTooWide);
    assert_eq!(d.c.market(&market).status, MarketStatus::Trading);
    assert!(!d.record_state().frozen);
    config.thresholds.max_band_bps = 3;
    d.c.set_config_state(&config);
    assert_eq!(d.settle_ok(&market).outcome, Outcome::Yes);
}

#[test]
fn a_record_outside_this_markets_own_window_is_refused() {
    // Every market of a stock and day should share its close, but the program doesn't make it so. A record taken
    // through a market closing at 4:00:00 PM can't settle one whose own close is earlier, or more than 5 s later.
    for close in [AT_4_00_PM - 10, AT_4_00_PM - 1, AT_4_00_PM + 6] {
        let mut d = day(1000);
        let at_4 = d.create(68_000);
        let other = d.c.create(&CreateMarketArgs { strike_cents: 69_000, close, ..meta_680() });
        d.record_real_close(&at_4);
        d.c.at(AT_4_00_PM + 60);
        let operator = d.c.operator;
        d.refused(&other, operator, MeridianError::OutsideWindow);
        assert_eq!(d.settle_ok(&at_4).outcome, Outcome::Yes, "the market the record was taken for settles");
    }
    // One whose close is up to 5 s after the price's publish time settles on it.
    let mut d = day(1000);
    let at_4 = d.create(68_000);
    let other = d.c.create(&CreateMarketArgs { strike_cents: 69_000, close: AT_4_00_PM + 5, ..meta_680() });
    d.record_real_close(&at_4);
    d.c.at(AT_4_00_PM + 60);
    assert_eq!(d.settle_ok(&other).outcome, Outcome::Yes);
}

#[test]
fn another_days_record_is_refused() {
    // D30: the record sits at its address for the market's stock and day.
    let mut d = day(1000);
    let market = d.create(68_000);
    d.record_real_close(&market);
    d.c.at(AT_4_00_PM + 60);
    let mut ix: Instruction = d.c.settle_ix(&market, d.c.operator);
    ix.accounts[2].pubkey = close_pda("META", 20_261_009).0;
    let r = d.c.run(&ix);
    assert!(common::refused_by_anchor(&r.program_result, anchor_lang::error::ErrorCode::ConstraintSeeds), "{:?}", r.program_result);
}
