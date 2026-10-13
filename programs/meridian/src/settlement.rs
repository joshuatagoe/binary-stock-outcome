//! The recorded close and settlement (ARCHITECTURE.md §4, §6, instructions 18 to 23), declared at M1's freeze (P12):
//! the RecordedClose account, and the accounts and arguments of Record close, Settle, Hold, Propose result,
//! Withdraw proposal and Finalize. Record close and Settle are built (M3-a); Hold, Propose result, Withdraw proposal,
//! Finalize and Settle's backstops (D68) return NotImplemented until M3-b.
use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{PriceFeedMessage, PriceUpdateV2, VerificationLevel};

use crate::{
    errors::MeridianError,
    events::{CloseRecorded, EventWriter, MarketHeld, MarketSettled},
    market::{HoldReason, Market, MarketStatus, Outcome, SettledBy, MARKET_SEED},
    Config, CONFIG_SEED,
};

pub const CLOSE_SEED: &[u8] = b"close";

/// A sane exponent (D28) is one the strike, in cents, scales to exactly (A4): from -2 (cents) to -12. Pyth's equity
/// feeds use -5 (F4.56).
pub const COARSEST_EXPONENT: i32 = -2;
pub const FINEST_EXPONENT: i32 = -12;

/// Reads a Pyth price update the way D28 and D125 say: the account's owner is one of Config's receivers (D80), its
/// bytes are Pyth's PriceUpdateV2 layout, and it is fully verified. Anything else is PriceNotGenuine. The feed and the
/// publish time are the caller's to check (F4.01).
fn genuine_price(account: &AccountInfo, receivers: &[Pubkey]) -> Result<PriceFeedMessage> {
    require!(receivers.contains(account.owner), MeridianError::PriceNotGenuine);
    let data = account.try_borrow_data()?;
    let update = PriceUpdateV2::try_deserialize(&mut &data[..]).map_err(|_| error!(MeridianError::PriceNotGenuine))?;
    require!(update.verification_level == VerificationLevel::Full, MeridianError::PriceNotGenuine);
    Ok(update.price_message)
}

/// D28: a price above zero, with an exponent the strike scales to exactly.
fn sane(price: i64, expo: i32) -> bool {
    price > 0 && (FINEST_EXPONENT..=COARSEST_EXPONENT).contains(&expo)
}

/// D57, D103: published at or before the close, and no more than `window` seconds earlier.
fn in_window(publish_time: i64, close: i64, window: u32) -> bool {
    publish_time <= close && close.saturating_sub(publish_time) <= window as i64
}

/// D26, D106: the price is above zero and its band is at most `max_bps` of it.
fn band_ok(price: i64, conf: u64, max_bps: u16) -> bool {
    price > 0 && conf as u128 * 10_000 <= max_bps as u128 * price as u128
}

/// D1, D26, A4: the whole band at or above the strike pays Yes, the whole band below it pays No, and a band containing
/// the strike decides nothing (D59). The strike is scaled up to Pyth's exponent and Pyth's price is never rounded:
/// $680 is 68,000,000 at exponent -5. The price must pass `sane` first, so the scaling is exact and can't overflow.
pub fn decide(price: i64, conf: u64, expo: i32, strike_cents: u64) -> Option<Outcome> {
    let scale = 10i128.pow((COARSEST_EXPONENT - expo) as u32);
    let strike = strike_cents as i128 * scale;
    let (low, high) = (price as i128 - conf as i128, price as i128 + conf as i128);
    if low >= strike {
        Some(Outcome::Yes)
    } else if high < strike {
        Some(Outcome::No)
    } else {
        None
    }
}

/// The stock's record at its address, or None while the address holds no record (it may hold lamports sent to it).
fn read_record(account: &AccountInfo) -> Result<Option<RecordedClose>> {
    if account.owner != &crate::ID {
        return Ok(None);
    }
    Ok(Some(RecordedClose::try_deserialize(&mut &account.try_borrow_data()?[..])?))
}

fn write_record(account: &AccountInfo, record: &RecordedClose) -> Result<()> {
    let mut data = account.try_borrow_mut_data()?;
    let mut writer: &mut [u8] = &mut data[..];
    record.try_serialize(&mut writer)
}

/// One stock's recorded close for one trading day (D105): improved only by a later price published at or before
/// the close, and frozen at the first settle on that stock.
#[account]
#[derive(InitSpace)]
pub struct RecordedClose {
    pub ticker: [u8; 8],
    pub day: u32,
    pub price: i64,
    pub conf: u64,
    pub expo: i32,
    pub publish_time: i64,
    /// The Pyth price account it came from.
    pub price_account: Pubkey,
    pub recorder: Pubkey,
    pub recorded_slot: u64,
    pub frozen: bool,
    pub bump: u8,
    pub _reserved: [u8; 32],
}

/// Anyone records a stock's close from a Pyth price account (D28, D57, D80, D103): created the first time, improved by
/// a later valid price after. The recorder pays the deposit the first time. Any market of that stock and day gives
/// the stored close (an early close included) and the feed it settles on (D49).
#[event_cpi]
#[derive(Accounts)]
pub struct RecordClose<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(
        seeds = [MARKET_SEED, market.ticker_bytes(), &market.day.to_le_bytes(), &market.strike_cents.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, Market>>,
    /// CHECK: the stock's record for the market's day, at its address; created here the first time.
    #[account(mut, seeds = [CLOSE_SEED, market.ticker_bytes(), &market.day.to_le_bytes()], bump)]
    pub recorded_close: UncheckedAccount<'info>,
    /// CHECK: a Pyth price update; its owner must be one of Config's accepted receivers, checked in the body (§9).
    pub price_account: UncheckedAccount<'info>,
    #[account(mut)]
    pub recorder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// After the market's stored close by the chain's clock (D57), a genuine price for the market's pinned feed (D28, D55,
/// D80, D125), published at or before the close and no more than the window earlier (D103), with a band within the
/// limit (D106), becomes the stock's record for the day, or replaces it if it was published later and the record
/// hasn't frozen (D105). Event: CloseRecorded.
pub fn handle_record_close(ctx: Context<RecordClose>) -> Result<()> {
    let a = &ctx.accounts;
    let (market, th) = (&a.market, &a.config.thresholds);
    require!(Clock::get()?.unix_timestamp > market.close, MeridianError::BeforeClose);
    let p = genuine_price(&a.price_account, &a.config.pyth_receivers)?;
    require!(p.feed_id == market.feed_id, MeridianError::WrongFeed);
    require!(sane(p.price, p.exponent), MeridianError::PriceNotGenuine);
    require!(in_window(p.publish_time, market.close, th.publish_window_secs), MeridianError::OutsideWindow);
    require!(band_ok(p.price, p.conf, th.max_band_bps), MeridianError::BandTooWide);

    let record_info = a.recorded_close.to_account_info();
    let mut record = match read_record(&record_info)? {
        Some(existing) => {
            require!(!existing.frozen, MeridianError::RecordFrozen);
            require!(p.publish_time > existing.publish_time, MeridianError::PriceNotLater);
            existing
        }
        None => {
            // The first price of the day: the recorder pays the deposit. An address already holding lamports is
            // topped up and adopted, as Create market's are (D139).
            let space = 8 + RecordedClose::INIT_SPACE;
            let (day, bump) = (market.day.to_le_bytes(), [ctx.bumps.recorded_close]);
            let seeds: &[&[u8]] = &[CLOSE_SEED, market.ticker_bytes(), &day, &bump];
            let lamports = Rent::get()?.minimum_balance(space);
            let (system, recorder) = (a.system_program.to_account_info(), a.recorder.to_account_info());
            crate::token::create_account(&system, &recorder, &record_info, lamports, space as u64, &crate::ID, &[seeds])?;
            RecordedClose {
                ticker: market.ticker,
                day: market.day,
                price: 0,
                conf: 0,
                expo: 0,
                publish_time: 0,
                price_account: Pubkey::default(),
                recorder: Pubkey::default(),
                recorded_slot: 0,
                frozen: false,
                bump: ctx.bumps.recorded_close,
                _reserved: [0; 32],
            }
        }
    };
    record.price = p.price;
    record.conf = p.conf;
    record.expo = p.exponent;
    record.publish_time = p.publish_time;
    record.price_account = a.price_account.key();
    record.recorder = a.recorder.key();
    record.recorded_slot = Clock::get()?.slot;
    write_record(&record_info, &record)?;

    EventWriter::new(a.event_authority.to_account_info()).emit(&CloseRecorded {
        ticker: String::from_utf8_lossy(market.ticker_bytes()).into_owned(),
        day: record.day,
        price: record.price,
        conf: record.conf,
        expo: record.expo,
        publish_time: record.publish_time,
        price_account: record.price_account,
        recorder: record.recorder,
    })
}

/// The operator for 24 hours after the close, then anyone (D58): settles from the record, or puts the market under
/// review (band on the strike, or no price 15 minutes after the close), or settles a backstop (D68).
#[event_cpi]
#[derive(Accounts)]
pub struct Settle<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        seeds = [MARKET_SEED, market.ticker_bytes(), &market.day.to_le_bytes(), &market.strike_cents.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, Market>>,
    /// CHECK: the stock's record for the market's day, at its address; it may not exist yet (no price).
    #[account(mut, seeds = [CLOSE_SEED, market.ticker_bytes(), &market.day.to_le_bytes()], bump)]
    pub recorded_close: UncheckedAccount<'info>,
    pub settler: Signer<'info>,
}

/// After the stored close by the chain's clock (D57), the operator for 24 hours, then anyone (D58):
/// - with the stock's record, checked again against this market's own close and today's band limit, the whole band on
///   one side of the strike settles the market (D26), and a band containing the strike holds it (D59); either way the
///   record freezes, so every strike of the stock settles on one price (D105);
/// - with no record, the market is held for "no price" once 15 minutes have passed since the close (D83), and refused
///   with BeforeClose until then.
///
/// A result is written once (D2). A held market waits for the admin's override or the backstops (D63, D68), which are
/// M3-b's. Events: MarketSettled or MarketHeld. Settle moves no money, so the vault's rule (D64) holds as before.
pub fn handle_settle(ctx: Context<Settle>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let (config, market) = (&ctx.accounts.config, &ctx.accounts.market);
    match market.status {
        MarketStatus::Trading => {}
        MarketStatus::Settled => return err!(MeridianError::AlreadySettled),
        MarketStatus::UnderReview | MarketStatus::Proposed => return err!(MeridianError::NotImplemented),
    }
    let (close, th) = (market.close, config.thresholds);
    require!(now > close, MeridianError::BeforeClose);
    if now < close.saturating_add(th.operator_only_settle_secs as i64) {
        require_keys_eq!(ctx.accounts.settler.key(), config.operator, MeridianError::NotOperator);
    }

    let record_info = ctx.accounts.recorded_close.to_account_info();
    let market_key = market.key();
    let mut events = EventWriter::new(ctx.accounts.event_authority.to_account_info());
    let Some(mut record) = read_record(&record_info)? else {
        require!(now >= close.saturating_add(th.no_price_hold_after_secs as i64), MeridianError::BeforeClose);
        let m = &mut ctx.accounts.market;
        m.status = MarketStatus::UnderReview;
        m.hold = HoldReason::NoPrice;
        return events.emit(&MarketHeld { market: market_key, reason: HoldReason::NoPrice, note: String::new() });
    };
    require!(in_window(record.publish_time, close, th.publish_window_secs), MeridianError::OutsideWindow);
    require!(sane(record.price, record.expo), MeridianError::PriceNotGenuine);
    require!(band_ok(record.price, record.conf, th.max_band_bps), MeridianError::BandTooWide);
    let decided = decide(record.price, record.conf, record.expo, market.strike_cents);
    if !record.frozen {
        record.frozen = true;
        write_record(&record_info, &record)?;
    }

    let m = &mut ctx.accounts.market;
    let Some(outcome) = decided else {
        m.status = MarketStatus::UnderReview;
        m.hold = HoldReason::BandOnStrike;
        return events.emit(&MarketHeld { market: market_key, reason: HoldReason::BandOnStrike, note: String::new() });
    };
    m.status = MarketStatus::Settled;
    m.outcome = outcome;
    m.settled_by = SettledBy::Oracle;
    m.price = record.price;
    m.conf = record.conf;
    m.expo = record.expo;
    m.publish_time = record.publish_time;
    events.emit(&MarketSettled {
        market: market_key,
        outcome,
        settled_by: SettledBy::Oracle,
        price: record.price,
        conf: record.conf,
        expo: record.expo,
        publish_time: record.publish_time,
    })
}

/// The admin's decisions on one market: Hold before Settled (D68), Propose result and Withdraw proposal while under
/// review (D63, D104).
#[event_cpi]
#[derive(Accounts)]
pub struct AdminMarket<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ MeridianError::NotAdmin)]
    pub config: Box<Account<'info, Config>>,
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [MARKET_SEED, market.ticker_bytes(), &market.day.to_le_bytes(), &market.strike_cents.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, Market>>,
    /// CHECK: the stock's record for the market's day, the reference for the override's bound (D63); it may not exist.
    #[account(seeds = [CLOSE_SEED, market.ticker_bytes(), &market.day.to_le_bytes()], bump)]
    pub recorded_close: UncheckedAccount<'info>,
}

/// The note is the admin's public answer (D70, D91), carried in MarketHeld.
pub fn handle_hold(_ctx: Context<AdminMarket>, _note: String) -> Result<()> {
    err!(MeridianError::NotImplemented)
}

/// The program works out the result from the official close (at or above the strike pays Yes, D1) and the wait.
pub fn handle_propose_result(_ctx: Context<AdminMarket>, _official_close_cents: u64, _source: String) -> Result<()> {
    err!(MeridianError::NotImplemented)
}

pub fn handle_withdraw_proposal(_ctx: Context<AdminMarket>) -> Result<()> {
    err!(MeridianError::NotImplemented)
}

/// Anyone, after the proposal's wait (D104): settled by the override.
#[event_cpi]
#[derive(Accounts)]
pub struct Finalize<'info> {
    #[account(
        mut,
        seeds = [MARKET_SEED, market.ticker_bytes(), &market.day.to_le_bytes(), &market.strike_cents.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, Market>>,
}

pub fn handle_finalize(_ctx: Context<Finalize>) -> Result<()> {
    err!(MeridianError::NotImplemented)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// D30's "the settle comparison tested over every price": for each accepted exponent, every price within 300 of
    /// Pyth's units of a $680 strike, with no band and with bands of 1 and 7 units. The strike in Pyth's units is
    /// written out as text, digit by digit, so the check doesn't share decide's arithmetic.
    #[test]
    fn decide_follows_the_rule_at_every_price_near_the_strike() {
        let strike_cents = 68_000u64;
        for expo in FINEST_EXPONENT..=COARSEST_EXPONENT {
            let zeros = (COARSEST_EXPONENT - expo) as usize;
            let strike: i64 = format!("{strike_cents}{}", "0".repeat(zeros)).parse().unwrap();
            for conf in [0u64, 1, 7] {
                for offset in -300i64..=300 {
                    let expected = if offset - conf as i64 >= 0 {
                        Some(Outcome::Yes)
                    } else if offset + (conf as i64) < 0 {
                        Some(Outcome::No)
                    } else {
                        None
                    };
                    assert_eq!(decide(strike + offset, conf, expo, strike_cents), expected, "expo {expo}, offset {offset} ±{conf}");
                }
            }
        }
    }

    #[test]
    fn the_window_ends_at_the_close_and_the_band_limit_is_inclusive() {
        let close = 1_791_489_600;
        assert!(in_window(close, close, 5) && in_window(close - 5, close, 5));
        assert!(!in_window(close - 6, close, 5) && !in_window(close + 1, close, 5) && !in_window(i64::MIN, close, 5));
        // 25 bps of 720.73285 is 1.80183...: ±1.80183 passes, ±1.80184 doesn't, and no band overflows the check.
        assert!(band_ok(72_073_285, 180_183, 25) && !band_ok(72_073_285, 180_184, 25) && !band_ok(1, u64::MAX, 10_000));
        assert!(!band_ok(0, 0, 25) && !band_ok(-1, 0, 25), "a price at or below zero has no band to accept");
        assert!(sane(1, -2) && sane(1, -12) && !sane(1, -1) && !sane(1, -13) && !sane(0, -5) && !sane(-1, -5));
    }
}
