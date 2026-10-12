//! The admin's instructions (ARCHITECTURE.md §6, instructions 2 to 5): Update config, the two-step admin rotation
//! (D109), Set operator (D27), Pause and Unpause (D68).
use anchor_lang::prelude::*;

use crate::{
    config::{validate_ladder, validate_receivers, validate_thresholds, validate_tickers},
    errors::MeridianError,
    events::{AdminAccepted, AdminProposed, ConfigUpdated, EventWriter, OperatorChanged, Paused, Unpaused},
    Config, Thresholds, Ticker, CONFIG_SEED,
};

/// The most fills one order may take: what the spike measured as safe (M1.01). Past 61 a transaction runs out of its
/// 64 instructions, so raising this needs the spike re-measured.
pub const FILL_LIMIT_CAP: u16 = 32;

#[event_cpi]
#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ MeridianError::NotAdmin)]
    pub config: Box<Account<'info, Config>>,
    pub admin: Signer<'info>,
}

/// Each field that is set replaces Config's; the rest stay. Tickers and the ladder shape the next markets created;
/// a market keeps the strike, times and feed it was created with (D49, D53, D139).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq, Default)]
pub struct UpdateConfigArgs {
    pub pyth_receivers: Option<Vec<Pubkey>>,
    pub tickers: Option<Vec<Ticker>>,
    pub ladder_bps: Option<[u16; 3]>,
    pub thresholds: Option<Thresholds>,
    pub fill_limit: Option<u16>,
}

pub fn handle_update_config(ctx: Context<AdminOnly>, args: UpdateConfigArgs) -> Result<()> {
    let config = &mut ctx.accounts.config;
    if let Some(receivers) = args.pyth_receivers {
        validate_receivers(&receivers)?;
        config.pyth_receivers = receivers;
    }
    if let Some(tickers) = args.tickers {
        validate_tickers(&tickers)?;
        config.tickers = tickers;
    }
    if let Some(ladder) = args.ladder_bps {
        validate_ladder(ladder)?;
        config.ladder_bps = ladder;
    }
    if let Some(thresholds) = args.thresholds {
        validate_thresholds(&thresholds)?;
        config.thresholds = thresholds;
    }
    if let Some(limit) = args.fill_limit {
        require!((1..=FILL_LIMIT_CAP).contains(&limit), MeridianError::FillLimitTooHigh);
        config.fill_limit = limit;
    }
    let c = &ctx.accounts.config;
    EventWriter::new(ctx.accounts.event_authority.to_account_info()).emit(&ConfigUpdated {
        admin: ctx.accounts.admin.key(),
        pyth_receivers: c.pyth_receivers.clone(),
        tickers: c.tickers.clone(),
        ladder_bps: c.ladder_bps,
        thresholds: c.thresholds,
        fill_limit: c.fill_limit,
    })
}

pub fn handle_propose_admin(ctx: Context<AdminOnly>, new_admin: Pubkey) -> Result<()> {
    require_keys_neq!(new_admin, Pubkey::default(), MeridianError::MissingKey);
    ctx.accounts.config.pending_admin = Some(new_admin);
    EventWriter::new(ctx.accounts.event_authority.to_account_info())
        .emit(&AdminProposed { admin: ctx.accounts.admin.key(), proposed: new_admin })
}

#[event_cpi]
#[derive(Accounts)]
pub struct AcceptAdmin<'info> {
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.pending_admin == Some(new_admin.key()) @ MeridianError::NotPendingAdmin
    )]
    pub config: Box<Account<'info, Config>>,
    pub new_admin: Signer<'info>,
}

pub fn handle_accept_admin(ctx: Context<AcceptAdmin>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let previous = config.admin;
    config.admin = ctx.accounts.new_admin.key();
    config.pending_admin = None;
    EventWriter::new(ctx.accounts.event_authority.to_account_info())
        .emit(&AdminAccepted { previous, admin: ctx.accounts.new_admin.key() })
}

pub fn handle_set_operator(ctx: Context<AdminOnly>, operator: Pubkey) -> Result<()> {
    require_keys_neq!(operator, Pubkey::default(), MeridianError::MissingKey);
    let previous = ctx.accounts.config.operator;
    ctx.accounts.config.operator = operator;
    EventWriter::new(ctx.accounts.event_authority.to_account_info()).emit(&OperatorChanged { previous, operator })
}

pub fn handle_pause(ctx: Context<AdminOnly>) -> Result<()> {
    ctx.accounts.config.paused = true;
    EventWriter::new(ctx.accounts.event_authority.to_account_info()).emit(&Paused { admin: ctx.accounts.admin.key() })
}

pub fn handle_unpause(ctx: Context<AdminOnly>) -> Result<()> {
    ctx.accounts.config.paused = false;
    EventWriter::new(ctx.accounts.event_authority.to_account_info()).emit(&Unpaused { admin: ctx.accounts.admin.key() })
}
