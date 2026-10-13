//! Record close (ARCHITECTURE.md §4 "The recorded close", §6 instruction 18; D28, D55, D57, D80, D103, D105, D125) in
//! Mollusk, with real Pyth price accounts saved from devnet (tests/fixtures/pyth-prices.json): Zach's push accounts
//! through the legacy receiver (PS.01, PS.02), META's 4:00:00 PM close of 2026-10-08 through the upgraded receiver
//! (PS.06), and an older post that was only partly verified. Crafted variants of them cover the other refusals. Anyone
//! records; the program reads Pyth's layout itself and checks the owner against Config's receivers (D125).
mod common;

use {
    anchor_lang::{error::ErrorCode, prelude::Pubkey, solana_program::instruction::Instruction},
    common::{
        close_pda, crafted, feed, feed_of, meta_680, price_update, pyth, refused_by_anchor, refused_with, rent,
        with_update, Chain, AT_4_00_PM, GOOG_FEED, LEGACY_RECEIVER, UPGRADED_RECEIVER,
    },
    meridian::{errors::MeridianError, CreateMarketArgs, RecordedClose},
    pyth_solana_receiver_sdk::price_update::VerificationLevel,
    solana_account::Account,
};

/// 6:06:06 PM ET on 2026-10-13, when Zach's META and AAPL push accounts were last written before they were saved.
const ZACH_META_PUBLISHED: i64 = 1_791_929_166;

fn ok(c: &mut Chain, ix: &Instruction) {
    let r = c.run(ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
}

fn refused(c: &mut Chain, ix: &Instruction, error: MeridianError) {
    let r = c.run(ix);
    assert!(refused_with(&r.program_result, error), "expected {error:?}: {:?}", r.program_result);
}

/// Config with both receivers and the real feeds, and a recorder with SOL.
fn chain() -> (Chain, Pubkey) {
    let mut c = Chain::new(false);
    c.use_pyth(vec![LEGACY_RECEIVER, UPGRADED_RECEIVER], 1000);
    let recorder = Pubkey::new_unique();
    c.set(recorder, Account { lamports: 1_000_000_000, ..Account::default() });
    (c, recorder)
}

/// A market of `ticker` on `day` whose stored close is `close`: opens 6½ hours before it, minting half an hour earlier.
fn market_closing_at(ticker: &str, day: u32, close: i64, strike_cents: u64) -> CreateMarketArgs {
    let open = close - 23_400;
    CreateMarketArgs { ticker: ticker.into(), day, strike_cents, mint_open: open - 1_800, open, close }
}

/// Adds a price account to the chain and returns its address.
fn post(c: &mut Chain, (key, account): (Pubkey, Account)) -> Pubkey {
    c.set(key, account);
    key
}

#[test]
fn the_fixtures_are_what_devnet_held() {
    // Every fixture decodes with Pyth's layout to what pyth-prices.json recorded when it was saved.
    let (_, account) = pyth("meta_close_20261008_upgraded");
    assert_eq!(account.owner, UPGRADED_RECEIVER);
    let u = price_update(&account);
    assert_eq!(u.verification_level, VerificationLevel::Full);
    assert_eq!(u.price_message.feed_id, feed_of("META"));
    let m = &u.price_message;
    assert_eq!((m.price, m.conf, m.exponent, m.publish_time), (72_073_285, 19_645, -5, AT_4_00_PM));

    let (_, account) = pyth("meta_push_legacy");
    assert_eq!(account.owner, LEGACY_RECEIVER);
    let u = price_update(&account);
    assert_eq!((u.verification_level, u.price_message.feed_id), (VerificationLevel::Full, feed_of("META")));
    assert_eq!(u.price_message.publish_time, ZACH_META_PUBLISHED);

    let (_, account) = pyth("aapl_push_legacy");
    assert_eq!((account.owner, price_update(&account).price_message.feed_id), (LEGACY_RECEIVER, feed_of("AAPL")));

    let (_, account) = pyth("meta_partial_legacy");
    let u = price_update(&account);
    assert_eq!((account.owner, u.verification_level), (LEGACY_RECEIVER, VerificationLevel::Partial { num_signatures: 5 }));
    assert_eq!(u.price_message.feed_id, feed_of("META"));
}

#[test]
fn the_upgraded_receivers_4_00_pm_close_is_recorded_and_the_recorder_pays_the_deposit() {
    let (mut c, recorder) = chain();
    let market = c.create(&meta_680());
    let price = post(&mut c, pyth("meta_close_20261008_upgraded"));
    c.at(AT_4_00_PM + 1);
    let ix = c.record_close_ix(&market, price, recorder);
    let r = c.run(&ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);

    let record = c.recorded_close("META", 20_261_008).expect("the record exists");
    assert_eq!((&record.ticker[..4], &record.ticker[4..], record.day), (&b"META"[..], &[0u8; 4][..], 20_261_008));
    assert_eq!((record.price, record.conf, record.expo, record.publish_time), (72_073_285, 19_645, -5, AT_4_00_PM));
    assert_eq!((record.price_account, record.recorder, record.frozen), (price, recorder, false));
    assert_eq!(record.bump, close_pda("META", 20_261_008).1);
    let account = c.account(&close_pda("META", 20_261_008).0).unwrap();
    assert_eq!((account.owner, account.data.len()), (meridian::ID, 8 + <RecordedClose as anchor_lang::Space>::INIT_SPACE));
    assert_eq!(account.data.len(), 154, "ARCHITECTURE.md §5's size");
    assert_eq!(account.lamports, rent(&c.m, 154));
    assert_eq!(c.account(&recorder).unwrap().lamports, 1_000_000_000 - rent(&c.m, 154), "the recorder paid the deposit");
}

#[test]
fn zachs_legacy_push_price_is_recorded() {
    // D80: his posts go through the legacy receiver. A market whose stored close is the moment his price was published.
    let (mut c, recorder) = chain();
    let args = market_closing_at("META", 20_261_013, ZACH_META_PUBLISHED, 76_000);
    let market = c.create(&args);
    let price = post(&mut c, pyth("meta_push_legacy"));
    c.at(ZACH_META_PUBLISHED + 1);
    let ix = c.record_close_ix(&market, price, recorder);
    ok(&mut c, &ix);
    let record = c.recorded_close("META", 20_261_013).unwrap();
    assert_eq!((record.price, record.conf, record.expo, record.publish_time), (76_324_882, 9_918, -5, ZACH_META_PUBLISHED));
    assert_eq!(record.price_account, price);
}

#[test]
fn anyone_records_through_any_market_of_that_stock_and_day() {
    // The record is the stock's, for the day: recorded through META $700, it is the one META $680 settles on.
    let (mut c, recorder) = chain();
    let m680 = c.create(&meta_680());
    let m700 = c.create(&CreateMarketArgs { strike_cents: 70_000, ..meta_680() });
    let price = post(&mut c, pyth("meta_close_20261008_upgraded"));
    c.at(AT_4_00_PM + 30);
    let ix = c.record_close_ix(&m700, price, recorder);
    ok(&mut c, &ix);
    let via_700 = c.record_close_ix(&m700, price, recorder);
    let via_680 = c.record_close_ix(&m680, price, recorder);
    assert_eq!(via_700.accounts[2], via_680.accounts[2], "one record per stock per day (D105)");
    assert!(c.recorded_close("META", 20_261_008).is_some());
}

#[test]
fn a_price_account_owned_by_another_program_is_refused() {
    // D125: the owner is checked against Config's list, for each receiver. The same real bytes under any other owner,
    // including this program and the system program, prove nothing.
    let (_, real) = pyth("meta_close_20261008_upgraded");
    for owner in [Pubkey::new_unique(), meridian::ID, anchor_lang::system_program::ID, LEGACY_RECEIVER] {
        let (mut c, recorder) = chain();
        c.use_pyth(vec![UPGRADED_RECEIVER], 1000);
        let market = c.create(&meta_680());
        let price = post(&mut c, (Pubkey::new_unique(), Account { owner, ..real.clone() }));
        c.at(AT_4_00_PM + 1);
        let ix = c.record_close_ix(&market, price, recorder);
        refused(&mut c, &ix, MeridianError::PriceNotGenuine);
        assert!(c.recorded_close("META", 20_261_008).is_none(), "{owner}: nothing recorded");
    }
    // A Config that accepts only the upgraded receiver refuses Zach's legacy account, and one that accepts only the
    // legacy receiver refuses the upgraded one: the wrong-owner case for each receiver.
    for (accepted, fixture, day, close) in [
        (UPGRADED_RECEIVER, "meta_push_legacy", 20_261_013, ZACH_META_PUBLISHED),
        (LEGACY_RECEIVER, "meta_close_20261008_upgraded", 20_261_008, AT_4_00_PM),
    ] {
        let (mut c, recorder) = chain();
        c.use_pyth(vec![accepted], 1000);
        let market = c.create(&market_closing_at("META", day, close, 76_000));
        let price = post(&mut c, pyth(fixture));
        c.at(close + 1);
        let ix = c.record_close_ix(&market, price, recorder);
        refused(&mut c, &ix, MeridianError::PriceNotGenuine);
    }
}

#[test]
fn an_account_that_is_not_a_price_update_is_refused() {
    // Owned by an accepted receiver but not a price update: another account type's discriminator, or too short.
    let (_, real) = pyth("meta_close_20261008_upgraded");
    let mut other_type = real.clone();
    other_type.data[0] ^= 0xff;
    let short = Account { data: real.data[..100].to_vec(), ..real.clone() };
    let empty = Account { data: vec![], ..real.clone() };
    for (label, account) in [("another type", other_type), ("too short", short), ("empty", empty)] {
        let (mut c, recorder) = chain();
        let market = c.create(&meta_680());
        let price = post(&mut c, (Pubkey::new_unique(), account));
        c.at(AT_4_00_PM + 1);
        let r = c.run(&c.record_close_ix(&market, price, recorder));
        assert!(refused_with(&r.program_result, MeridianError::PriceNotGenuine), "{label}: {:?}", r.program_result);
    }
}

#[test]
fn a_partly_verified_update_is_refused() {
    // D28: fully verified only. A real post that was only partly verified (5 signatures), against a market whose
    // stored close is its publish time, so only the verification is wrong.
    let (mut c, recorder) = chain();
    let (_, real) = pyth("meta_partial_legacy");
    let published = price_update(&real).price_message.publish_time;
    let market = c.create(&market_closing_at("META", 20_260_604, published, 62_000));
    let price = post(&mut c, pyth("meta_partial_legacy"));
    c.at(published + 1);
    let ix = c.record_close_ix(&market, price, recorder);
    refused(&mut c, &ix, MeridianError::PriceNotGenuine);

    // The 4:00 PM close itself, marked as partly verified, is refused; the same bytes fully verified are accepted.
    let (mut c, recorder) = chain();
    let market = c.create(&meta_680());
    let (_, real) = pyth("meta_close_20261008_upgraded");
    let mut update = price_update(&real);
    for signatures in [0, 3, 5, 255] {
        update.verification_level = VerificationLevel::Partial { num_signatures: signatures };
        let price = post(&mut c, (Pubkey::new_unique(), with_update(&real, &update)));
        c.at(AT_4_00_PM + 1);
        let ix = c.record_close_ix(&market, price, recorder);
        refused(&mut c, &ix, MeridianError::PriceNotGenuine);
    }
    let price = post(&mut c, pyth("meta_close_20261008_upgraded"));
    let ix = c.record_close_ix(&market, price, recorder);
    ok(&mut c, &ix);
}

#[test]
fn another_feed_is_refused() {
    // D55: the market's pinned feed only. Zach's real AAPL account against META, and GOOG's feed against GOOGL.
    let (mut c, recorder) = chain();
    let market = c.create(&market_closing_at("META", 20_261_013, ZACH_META_PUBLISHED, 76_000));
    let aapl = post(&mut c, pyth("aapl_push_legacy"));
    c.at(ZACH_META_PUBLISHED + 1);
    let ix = c.record_close_ix(&market, aapl, recorder);
    refused(&mut c, &ix, MeridianError::WrongFeed);

    let (mut c, recorder) = chain();
    let googl = c.create(&CreateMarketArgs { ticker: "GOOGL".into(), strike_cents: 300_000, ..meta_680() });
    let goog = post(&mut c, crafted("meta_close_20261008_upgraded", |m| m.feed_id = feed(GOOG_FEED)));
    let meta_price = post(&mut c, pyth("meta_close_20261008_upgraded"));
    c.at(AT_4_00_PM + 1);
    let ix = c.record_close_ix(&googl, goog, recorder);
    refused(&mut c, &ix, MeridianError::WrongFeed);
    let ix = c.record_close_ix(&googl, meta_price, recorder);
    refused(&mut c, &ix, MeridianError::WrongFeed);
    // GOOGL's own feed is accepted.
    let googl_price = post(&mut c, crafted("meta_close_20261008_upgraded", |m| m.feed_id = feed_of("GOOGL")));
    let ix = c.record_close_ix(&googl, googl_price, recorder);
    ok(&mut c, &ix);
}

#[test]
fn the_market_keeps_the_feed_it_was_created_with() {
    // D49, D139: a Config change after the market was created doesn't move its settlement to another feed.
    let (mut c, recorder) = chain();
    let market = c.create(&meta_680());
    let mut config = c.config_state();
    config.tickers.iter_mut().find(|t| t.symbol == "META").unwrap().feed_id = feed(GOOG_FEED);
    c.set_config_state(&config);
    let goog = post(&mut c, crafted("meta_close_20261008_upgraded", |m| m.feed_id = feed(GOOG_FEED)));
    c.at(AT_4_00_PM + 1);
    let ix = c.record_close_ix(&market, goog, recorder);
    refused(&mut c, &ix, MeridianError::WrongFeed);
    let price = post(&mut c, pyth("meta_close_20261008_upgraded"));
    let ix = c.record_close_ix(&market, price, recorder);
    ok(&mut c, &ix);
}

#[test]
fn the_publish_time_must_be_at_or_before_the_close_and_no_more_than_5_seconds_earlier() {
    // D103, with the real 4:00:00 PM price and markets whose stored close is moved around it.
    for (label, close, accepted) in [
        ("published at the close", AT_4_00_PM, true),
        ("published 5 s before the close", AT_4_00_PM + 5, true),
        ("published 6 s before the close", AT_4_00_PM + 6, false),
        ("published 27 s before the close (AR.10)", AT_4_00_PM + 27, false),
        ("published 1 s after the close", AT_4_00_PM - 1, false),
        ("published 5 minutes after the close", AT_4_00_PM - 300, false),
    ] {
        let (mut c, recorder) = chain();
        let market = c.create(&market_closing_at("META", 20_261_008, close, 68_000));
        let price = post(&mut c, pyth("meta_close_20261008_upgraded"));
        c.at(close.max(AT_4_00_PM) + 60);
        let r = c.run(&c.record_close_ix(&market, price, recorder));
        if accepted {
            assert!(r.program_result.is_ok(), "{label}: {:?}", r.program_result);
        } else {
            assert!(refused_with(&r.program_result, MeridianError::OutsideWindow), "{label}: {:?}", r.program_result);
        }
    }
}

#[test]
fn a_price_at_or_below_zero_or_an_odd_exponent_is_refused() {
    // D28: a price above zero and a sane exponent: -2 (cents) to -12, so the strike scales to it exactly (A4).
    let cases: [(&str, i64, i32); 6] = [
        ("price 0", 0, -5),
        ("price -1", -1, -5),
        ("exponent 0", 720, 0),
        ("exponent -1", 7_207, -1),
        ("exponent +2", 7, 2),
        ("exponent -13", 7_207_328_500_000_000, -13),
    ];
    for (label, value, exponent) in cases {
        let (mut c, recorder) = chain();
        let market = c.create(&meta_680());
        let price = post(&mut c, crafted("meta_close_20261008_upgraded", |m| {
            m.price = value;
            m.conf = 0;
            m.exponent = exponent;
        }));
        c.at(AT_4_00_PM + 1);
        let r = c.run(&c.record_close_ix(&market, price, recorder));
        assert!(refused_with(&r.program_result, MeridianError::PriceNotGenuine), "{label}: {:?}", r.program_result);
    }
    // The edges of the range are accepted.
    for (value, exponent) in [(72_073, -2), (720_732_850_000_000, -12)] {
        let (mut c, recorder) = chain();
        let market = c.create(&meta_680());
        let price = post(&mut c, crafted("meta_close_20261008_upgraded", |m| {
            m.price = value;
            m.conf = 0;
            m.exponent = exponent;
        }));
        c.at(AT_4_00_PM + 1);
        let r = c.run(&c.record_close_ix(&market, price, recorder));
        assert!(r.program_result.is_ok(), "exponent {exponent}: {:?}", r.program_result);
    }
}

#[test]
fn a_band_wider_than_25_bps_is_refused() {
    // D106: at most 25 bps of the price. META's real close is 720.73285: 25 bps is ±1.80183.
    for (conf, accepted) in [(180_183, true), (180_184, false), (19_645, true), (u64::MAX, false)] {
        let (mut c, recorder) = chain();
        let market = c.create(&meta_680());
        let price = post(&mut c, crafted("meta_close_20261008_upgraded", |m| m.conf = conf));
        c.at(AT_4_00_PM + 1);
        let r = c.run(&c.record_close_ix(&market, price, recorder));
        if accepted {
            assert!(r.program_result.is_ok(), "±{conf}: {:?}", r.program_result);
        } else {
            assert!(refused_with(&r.program_result, MeridianError::BandTooWide), "±{conf}: {:?}", r.program_result);
        }
    }
}

#[test]
fn recording_before_the_close_is_refused() {
    // D57, D105: the chain's clock must have passed the stored close, whatever the price's publish time.
    let (mut c, recorder) = chain();
    let market = c.create(&meta_680());
    let price = post(&mut c, pyth("meta_close_20261008_upgraded"));
    for at in [AT_4_00_PM - 3_600, AT_4_00_PM - 1, AT_4_00_PM] {
        c.at(at);
        let ix = c.record_close_ix(&market, price, recorder);
        refused(&mut c, &ix, MeridianError::BeforeClose);
    }
    assert!(c.recorded_close("META", 20_261_008).is_none());
    c.at(AT_4_00_PM + 1);
    let ix = c.record_close_ix(&market, price, recorder);
    ok(&mut c, &ix);
}

#[test]
fn only_a_later_price_replaces_the_record() {
    // D105: a price published 3 s before the close is recorded first; the real 4:00:00 PM price replaces it; then
    // neither an earlier price nor one published at the same moment can replace that.
    let (mut c, recorder) = chain();
    let market = c.create(&meta_680());
    let early = post(&mut c, crafted("meta_close_20261008_upgraded", |m| {
        m.publish_time = AT_4_00_PM - 3;
        m.price = 72_050_000;
    }));
    let at_close = post(&mut c, pyth("meta_close_20261008_upgraded"));
    let between = post(&mut c, crafted("meta_close_20261008_upgraded", |m| {
        m.publish_time = AT_4_00_PM - 1;
        m.price = 72_000_000;
    }));
    let same_moment = post(&mut c, crafted("meta_close_20261008_upgraded", |m| m.price = 71_000_000));
    c.at(AT_4_00_PM + 2);
    let ix = c.record_close_ix(&market, early, recorder);
    ok(&mut c, &ix);
    assert_eq!(c.recorded_close("META", 20_261_008).unwrap().price, 72_050_000);

    let improver = Pubkey::new_unique();
    c.set(improver, Account { lamports: 1_000_000_000, ..Account::default() });
    c.at(AT_4_00_PM + 90);
    let ix = c.record_close_ix(&market, at_close, improver);
    ok(&mut c, &ix);
    let record = c.recorded_close("META", 20_261_008).unwrap();
    assert_eq!((record.price, record.publish_time, record.price_account, record.recorder), (72_073_285, AT_4_00_PM, at_close, improver));
    assert_eq!(c.account(&improver).unwrap().lamports, 1_000_000_000, "an improvement pays no deposit");

    for (label, key, error) in [
        ("an earlier price", between, MeridianError::PriceNotLater),
        ("the first price again", early, MeridianError::PriceNotLater),
        ("a price published at the same moment", same_moment, MeridianError::PriceNotLater),
        ("the same price again", at_close, MeridianError::PriceNotLater),
    ] {
        let r = c.run(&c.record_close_ix(&market, key, recorder));
        assert!(refused_with(&r.program_result, error), "{label}: {:?}", r.program_result);
    }
    let record = c.recorded_close("META", 20_261_008).unwrap();
    assert_eq!((record.price, record.publish_time, record.price_account), (72_073_285, AT_4_00_PM, at_close), "unchanged");
}

#[test]
fn a_record_address_holding_lamports_already_is_adopted() {
    // The address is known in advance; a few lamports sent there first must not stop the stock's close from being
    // recorded (as Create market adopts its addresses, D139).
    let (mut c, recorder) = chain();
    let market = c.create(&meta_680());
    let record = close_pda("META", 20_261_008).0;
    c.set(record, Account { lamports: 1_000, ..Account::default() });
    let price = post(&mut c, pyth("meta_close_20261008_upgraded"));
    c.at(AT_4_00_PM + 1);
    let ix = c.record_close_ix(&market, price, recorder);
    ok(&mut c, &ix);
    assert_eq!(c.account(&record).unwrap().lamports, rent(&c.m, 154));
    assert_eq!(c.recorded_close("META", 20_261_008).unwrap().price, 72_073_285);
}

#[test]
fn another_days_or_stocks_record_address_is_refused() {
    // D30: the record sits at its address for the market's stock and day.
    let (mut c, recorder) = chain();
    let market = c.create(&meta_680());
    let price = post(&mut c, pyth("meta_close_20261008_upgraded"));
    c.at(AT_4_00_PM + 1);
    for (ticker, day) in [("META", 20_261_009), ("AAPL", 20_261_008)] {
        let mut ix = c.record_close_ix(&market, price, recorder);
        ix.accounts[2].pubkey = close_pda(ticker, day).0;
        assert!(refused_by_anchor(&c.run(&ix).program_result, ErrorCode::ConstraintSeeds), "{ticker} {day}");
    }
}
