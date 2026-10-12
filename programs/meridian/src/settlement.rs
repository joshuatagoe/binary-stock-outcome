//! The recorded close and settlement (ARCHITECTURE.md §4, §6, instructions 18 to 23), declared at M1's freeze (P12):
//! the RecordedClose account, and the accounts and arguments of Record close, Settle, Hold, Propose result,
//! Withdraw proposal and Finalize. The program lane builds the bodies in M3.
use anchor_lang::prelude::*;

use crate::{
    errors::MeridianError,
    market::{Market, MARKET_SEED},
    Config, CONFIG_SEED,
};

pub const CLOSE_SEED: &[u8] = b"close";

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

pub fn handle_record_close(_ctx: Context<RecordClose>) -> Result<()> {
    err!(MeridianError::NotImplemented)
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

pub fn handle_settle(_ctx: Context<Settle>) -> Result<()> {
    err!(MeridianError::NotImplemented)
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
