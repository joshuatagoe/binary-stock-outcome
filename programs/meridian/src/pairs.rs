//! Mint pairs and Redeem (ARCHITECTURE.md §6, instructions 8 and 9): 1.00 USDC into the vault for one Yes and one
//! No, and back. Redeem's pairs mode is the pair close (D38); its winning and losing modes need a result (M3).
use anchor_lang::prelude::*;

use crate::{
    errors::MeridianError,
    events::{EventWriter, PairsMinted, Redeemed},
    market::{check_vault, Market, MarketStatus, MARKET_SEED, NO_SEED, USDC_PER_PAIR, VAULT_SEED, YES_SEED},
    token::{self, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DECIMALS},
    Config, CONFIG_SEED,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RedeemMode {
    /// One Yes and one No for 1.00, before the market is Settled (D38).
    Pairs,
    /// A winning token for 1.00, once Settled.
    Winning,
    /// A losing token, burned for nothing once Settled, which closes its account (D94).
    Losing,
}

#[event_cpi]
#[derive(Accounts)]
pub struct MintPairs<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        seeds = [MARKET_SEED, market.ticker_bytes(), &market.day.to_le_bytes(), &market.strike_cents.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, Market>>,
    pub minter: Signer<'info>,
    /// CHECK: the minter's USDC account; the token program checks its owner and mint.
    #[account(mut, constraint = minter_usdc.key() != vault.key() @ MeridianError::DuplicateAccount)]
    pub minter_usdc: UncheckedAccount<'info>,
    /// CHECK: the minter's Yes account; the token program checks its mint.
    #[account(mut)]
    pub minter_yes: UncheckedAccount<'info>,
    /// CHECK: the minter's No account; likewise.
    #[account(mut, constraint = minter_no.key() != minter_yes.key() @ MeridianError::DuplicateAccount)]
    pub minter_no: UncheckedAccount<'info>,
    /// CHECK: the market's vault, at its address.
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump = market.vault_bump)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: the market's Yes mint, at its address.
    #[account(mut, seeds = [YES_SEED, market.key().as_ref()], bump = market.yes_bump)]
    pub yes_mint: UncheckedAccount<'info>,
    /// CHECK: the market's No mint, at its address.
    #[account(mut, seeds = [NO_SEED, market.key().as_ref()], bump = market.no_bump)]
    pub no_mint: UncheckedAccount<'info>,
    /// CHECK: Config's USDC mint.
    #[account(address = config.usdc_mint)]
    pub usdc_mint: UncheckedAccount<'info>,
    /// CHECK: the classic token program, for USDC.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
    /// CHECK: Token-2022, for Yes and No.
    #[account(address = TOKEN_2022_PROGRAM_ID)]
    pub token_2022_program: UncheckedAccount<'info>,
}

pub fn handle_mint_pairs(ctx: Context<MintPairs>, quantity: u64) -> Result<()> {
    let a = &ctx.accounts;
    require!(!a.config.paused, MeridianError::Paused);
    require!(quantity > 0, MeridianError::InvalidQuantity);
    let now = Clock::get()?.unix_timestamp;
    require!(now >= a.market.mint_open, MeridianError::NotOpenYet);
    let orders_close = a.market.close - a.config.thresholds.orders_close_before_secs as i64;
    require!(now < orders_close && a.market.status == MarketStatus::Trading, MeridianError::OrdersClosed);

    // The tokens go to the minter's own accounts, so its PairsMinted names who holds them (§5's event store).
    for account in [&a.minter_yes, &a.minter_no] {
        require_keys_eq!(token::owner(account)?, a.minter.key(), MeridianError::NotYourAccount);
    }
    let usdc = quantity.checked_mul(USDC_PER_PAIR).ok_or(MeridianError::InvalidQuantity)?;
    let (day, strike, bump) = (a.market.day.to_le_bytes(), a.market.strike_cents.to_le_bytes(), [a.market.bump]);
    let seeds = a.market.signer_seeds(&day, &strike, &bump);
    let (classic, t22, market) = (a.token_program.to_account_info(), a.token_2022_program.to_account_info(), a.market.to_account_info());
    token::transfer(&classic, &a.minter_usdc, &a.usdc_mint, &a.vault, &a.minter, usdc, USDC_DECIMALS, &[])?;
    token::mint_to(&t22, &a.yes_mint, &a.minter_yes, &market, quantity, &[&seeds])?;
    token::mint_to(&t22, &a.no_mint, &a.minter_no, &market, quantity, &[&seeds])?;

    let market_key = ctx.accounts.market.key();
    let m = &mut ctx.accounts.market;
    m.owed = m.owed.checked_add(quantity).ok_or(MeridianError::InvalidQuantity)?;
    EventWriter::new(ctx.accounts.event_authority.to_account_info()).emit(&PairsMinted {
        market: market_key,
        owner: ctx.accounts.minter.key(),
        quantity,
    })?;
    let a = &ctx.accounts;
    check_vault(&a.market, &a.vault, &a.yes_mint, &a.no_mint)
}

#[event_cpi]
#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        seeds = [MARKET_SEED, market.ticker_bytes(), &market.day.to_le_bytes(), &market.strike_cents.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, Market>>,
    /// Receives the USDC, and the deposits of any account emptied here (D94).
    #[account(mut)]
    pub holder: Signer<'info>,
    /// CHECK: the holder's USDC account; the token program checks its mint.
    #[account(mut, constraint = holder_usdc.key() != vault.key() @ MeridianError::DuplicateAccount)]
    pub holder_usdc: UncheckedAccount<'info>,
    /// CHECK: the holder's Yes account; the token program checks its owner and mint.
    #[account(mut)]
    pub holder_yes: UncheckedAccount<'info>,
    /// CHECK: the holder's No account; likewise.
    #[account(mut, constraint = holder_no.key() != holder_yes.key() @ MeridianError::DuplicateAccount)]
    pub holder_no: UncheckedAccount<'info>,
    /// CHECK: the market's vault, at its address.
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump = market.vault_bump)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: the market's Yes mint, at its address.
    #[account(mut, seeds = [YES_SEED, market.key().as_ref()], bump = market.yes_bump)]
    pub yes_mint: UncheckedAccount<'info>,
    /// CHECK: the market's No mint, at its address.
    #[account(mut, seeds = [NO_SEED, market.key().as_ref()], bump = market.no_bump)]
    pub no_mint: UncheckedAccount<'info>,
    /// CHECK: Config's USDC mint.
    #[account(address = config.usdc_mint)]
    pub usdc_mint: UncheckedAccount<'info>,
    /// CHECK: the classic token program, for USDC.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
    /// CHECK: Token-2022, for Yes and No.
    #[account(address = TOKEN_2022_PROGRAM_ID)]
    pub token_2022_program: UncheckedAccount<'info>,
}

pub fn handle_redeem(ctx: Context<Redeem>, mode: RedeemMode, quantity: u64) -> Result<()> {
    // Never paused: closing pairs and redeeming are ways out (D68).
    if mode != RedeemMode::Pairs {
        require!(ctx.accounts.market.status == MarketStatus::Settled, MeridianError::NotFinal);
        return err!(MeridianError::NotImplemented); // M3, with settlement
    }
    require!(quantity > 0, MeridianError::InvalidQuantity);
    require!(ctx.accounts.market.status != MarketStatus::Settled, MeridianError::MarketSettled);

    let a = &ctx.accounts;
    // The holder's own accounts only, so its Redeemed names whose tokens went and who was paid.
    for account in [&a.holder_usdc, &a.holder_yes, &a.holder_no] {
        require_keys_eq!(token::owner(account)?, a.holder.key(), MeridianError::NotYourAccount);
    }
    let usdc = quantity.checked_mul(USDC_PER_PAIR).ok_or(MeridianError::InvalidQuantity)?;
    let (day, strike, bump) = (a.market.day.to_le_bytes(), a.market.strike_cents.to_le_bytes(), [a.market.bump]);
    let seeds = a.market.signer_seeds(&day, &strike, &bump);
    let (classic, t22, market, holder) =
        (a.token_program.to_account_info(), a.token_2022_program.to_account_info(), a.market.to_account_info(), a.holder.to_account_info());
    token::permissioned_burn(&t22, &a.holder_yes, &a.yes_mint, &market, &holder, quantity, &[&seeds])?;
    token::permissioned_burn(&t22, &a.holder_no, &a.no_mint, &market, &holder, quantity, &[&seeds])?;
    token::transfer(&classic, &a.vault, &a.usdc_mint, &a.holder_usdc, &market, usdc, USDC_DECIMALS, &[&seeds])?;
    // D94: an emptied account is closed, and its deposit goes back to the holder, unless another key holds its close
    // authority.
    for account in [&a.holder_yes, &a.holder_no] {
        if token::can_close(account, &holder.key())? {
            token::close_account(&t22, account, &holder, &holder)?;
        }
    }

    let market_key = ctx.accounts.market.key();
    let m = &mut ctx.accounts.market;
    m.owed = m.owed.checked_sub(quantity).ok_or(MeridianError::SupplyOverOwed)?;
    EventWriter::new(ctx.accounts.event_authority.to_account_info()).emit(&Redeemed {
        market: market_key,
        owner: ctx.accounts.holder.key(),
        mode,
        quantity,
        usdc,
    })?;
    let a = &ctx.accounts;
    check_vault(&a.market, &a.vault, &a.yes_mint, &a.no_mint)
}
