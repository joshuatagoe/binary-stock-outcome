//! Config: the settings the program enforces (ARCHITECTURE.md §5, §11), and Initialize Config (§6, instruction 1).
use anchor_lang::prelude::*;

use crate::{errors::MeridianError, events::ConfigInitialized};

pub const CONFIG_SEED: &[u8] = b"config";
pub const MAX_TICKERS: usize = 8;
pub const MAX_RECEIVERS: usize = 2;

#[account]
#[derive(InitSpace)]
pub struct Config {
    /// Runs the admin instructions (D24). A key file on the laptop on devnet (D92).
    pub admin: Pubkey,
    /// The proposed next admin, until they accept (two-step rotation, D109).
    pub pending_admin: Option<Pubkey>,
    /// The backend's key: creates markets and settles, but can't pause or override (A5).
    pub operator: Pubkey,
    /// The dollar token. Circle's devnet USDC on devnet (D32).
    pub usdc_mint: Pubkey,
    /// Programs whose price accounts are accepted: Pyth's legacy and upgraded receivers (D80).
    #[max_len(2)]
    pub pyth_receivers: Vec<Pubkey>,
    /// The stocks, each pinned to its regular-session feed (D55, D28).
    #[max_len(8)]
    pub tickers: Vec<Ticker>,
    /// Strike offsets from the previous close, in basis points: ±3, 6 and 9% (D6, D49).
    pub ladder_bps: [u16; 3],
    /// Stops Mint pairs and Place order only (D68).
    pub paused: bool,
    pub thresholds: Thresholds,
    /// The most fills one order may take. Set from M1's order-book spike; 0 until then (D21).
    pub fill_limit: u16,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq, Eq, Debug)]
pub struct Ticker {
    /// "META": 1 to 8 capital letters.
    #[max_len(8)]
    pub symbol: String,
    /// Pyth's 32-byte feed ID for the stock's regular-session price (Equity.US.<ticker>/USD).
    pub feed_id: [u8; 32],
    /// Strikes are multiples of this, in cents: $10 is 1000 (D49).
    pub strike_step_cents: u32,
    /// New markets only for enabled stocks.
    pub enabled: bool,
}

/// The times and limits the program enforces, with ARCHITECTURE.md §11's devnet values.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq, Debug)]
pub struct Thresholds {
    /// Orders close this long before the stored close: 5 s (D102).
    pub orders_close_before_secs: u32,
    /// A recorded price must be published within this of the close: 5 s (D103).
    pub publish_window_secs: u32,
    /// The widest price band accepted: 25 basis points (D106).
    pub max_band_bps: u16,
    /// An override within this of the reference waits the short wait: 0.5% (D104).
    pub override_bound_bps: u16,
    /// The short wait before an override is final: 1 hour (D63, D104).
    pub override_wait_secs: u32,
    /// The wait outside the bound, or with no reference: 24 hours (D104).
    pub override_wait_long_secs: u32,
    /// Only the operator may settle for this long after the close: 24 hours (D58).
    pub operator_only_settle_secs: u32,
    /// An admin hold lapses after this: 24 hours (D68).
    pub admin_hold_backstop_secs: u32,
    /// A band-on-the-strike hold lapses after this: 7 days (D68).
    pub band_hold_backstop_secs: u32,
    /// With no recorded price this long after the close, the market is held: 15 minutes (D83).
    pub no_price_hold_after_secs: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct InitializeConfigArgs {
    pub admin: Pubkey,
    pub operator: Pubkey,
    pub usdc_mint: Pubkey,
    pub pyth_receivers: Vec<Pubkey>,
    pub tickers: Vec<Ticker>,
    pub ladder_bps: [u16; 3],
    pub thresholds: Thresholds,
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    /// Signs and pays the deposit.
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + Config::INIT_SPACE, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    /// The upgrade-key gate (AR.03): this program's own ProgramData, whose upgrade key signed.
    #[account(constraint = program.programdata_address()? == Some(program_data.key()) @ MeridianError::NotUpgradeAuthority)]
    pub program: Program<'info, crate::program::Meridian>,
    #[account(constraint = program_data.upgrade_authority_address == Some(authority.key()) @ MeridianError::NotUpgradeAuthority)]
    pub program_data: Account<'info, ProgramData>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_config(ctx: Context<InitializeConfig>, args: InitializeConfigArgs) -> Result<()> {
    validate(&args)?;
    let config = &mut ctx.accounts.config;
    config.admin = args.admin;
    config.pending_admin = None;
    config.operator = args.operator;
    config.usdc_mint = args.usdc_mint;
    config.pyth_receivers = args.pyth_receivers;
    config.tickers = args.tickers;
    config.ladder_bps = args.ladder_bps;
    config.paused = false;
    config.thresholds = args.thresholds;
    config.fill_limit = 0;
    config.bump = ctx.bumps.config;
    emit!(ConfigInitialized {
        admin: config.admin,
        operator: config.operator,
        usdc_mint: config.usdc_mint,
        tickers: config.tickers.len() as u8,
    });
    Ok(())
}

/// Circle's mainnet USDC mint, read from Circle's address page and checked on chain on 2026-10-10.
pub const MAINNET_USDC: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

fn validate(args: &InitializeConfigArgs) -> Result<()> {
    let keys = [args.admin, args.operator, args.usdc_mint];
    require!(keys.iter().all(|k| *k != Pubkey::default()), MeridianError::MissingKey);
    #[cfg(feature = "devnet")]
    require_keys_neq!(args.usdc_mint, MAINNET_USDC, MeridianError::MainnetUsdcOnDevnet);
    validate_receivers(&args.pyth_receivers)?;
    validate_tickers(&args.tickers)?;
    validate_ladder(args.ladder_bps)?;
    validate_thresholds(&args.thresholds)
}

pub(crate) fn validate_receivers(receivers: &[Pubkey]) -> Result<()> {
    require!(
        (1..=MAX_RECEIVERS).contains(&receivers.len())
            && receivers.iter().all(|r| *r != Pubkey::default())
            && (receivers.len() < 2 || receivers[0] != receivers[1]),
        MeridianError::InvalidReceivers
    );
    Ok(())
}

pub(crate) fn validate_tickers(tickers: &[Ticker]) -> Result<()> {
    require!((1..=MAX_TICKERS).contains(&tickers.len()), MeridianError::InvalidTickers);
    for (i, t) in tickers.iter().enumerate() {
        let symbol_ok = (1..=8).contains(&t.symbol.len()) && t.symbol.bytes().all(|b| b.is_ascii_uppercase());
        let unique = tickers[..i].iter().all(|other| other.symbol != t.symbol);
        require!(
            symbol_ok && unique && t.feed_id != [0; 32] && t.strike_step_cents > 0,
            MeridianError::InvalidTickers
        );
    }
    Ok(())
}

pub(crate) fn validate_ladder(ladder_bps: [u16; 3]) -> Result<()> {
    let [a, b, c] = ladder_bps;
    require!(0 < a && a < b && b < c && c <= 5_000, MeridianError::InvalidLadder);
    Ok(())
}

pub(crate) fn validate_thresholds(th: &Thresholds) -> Result<()> {
    let bps_ok = th.max_band_bps <= 10_000 && th.override_bound_bps <= 10_000;
    let secs = [
        th.orders_close_before_secs,
        th.publish_window_secs,
        th.override_wait_secs,
        th.override_wait_long_secs,
        th.operator_only_settle_secs,
        th.admin_hold_backstop_secs,
        th.band_hold_backstop_secs,
        th.no_price_hold_after_secs,
    ];
    require!(bps_ok && secs.iter().all(|s| *s > 0), MeridianError::InvalidThresholds);
    Ok(())
}
