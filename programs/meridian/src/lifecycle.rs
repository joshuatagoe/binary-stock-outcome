//! Remove market, Sweep, Return to owner and Close book (ARCHITECTURE.md §6, instructions 7, 15, 16 and 17),
//! declared at M1's freeze (P12): their accounts and arguments are the contract; the program lane builds the bodies in
//! M2 and M3.
use anchor_lang::prelude::*;

use crate::{
    book::{Book, BOOK_NO_SEED, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED},
    errors::MeridianError,
    market::{Market, MARKET_SEED, NO_SEED, VAULT_SEED, YES_SEED},
    token::{TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID},
    Config, CONFIG_SEED,
};

/// The admin removes a market before minting opens at 9:00 (D53): every account it created is closed, the mints
/// through their close authority (D140), and the deposits go back to whoever created it (D50).
#[event_cpi]
#[derive(Accounts)]
pub struct RemoveMarket<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ MeridianError::NotAdmin)]
    pub config: Box<Account<'info, Config>>,
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [MARKET_SEED, market.ticker_bytes(), &market.day.to_le_bytes(), &market.strike_cents.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, Market>>,
    /// CHECK: the market's Yes mint, at its address.
    #[account(mut, seeds = [YES_SEED, market.key().as_ref()], bump = market.yes_bump)]
    pub yes_mint: UncheckedAccount<'info>,
    /// CHECK: the market's No mint, at its address.
    #[account(mut, seeds = [NO_SEED, market.key().as_ref()], bump = market.no_bump)]
    pub no_mint: UncheckedAccount<'info>,
    /// CHECK: the market's vault, at its address.
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump = market.vault_bump)]
    pub vault: UncheckedAccount<'info>,
    #[account(mut, seeds = [BOOK_SEED, market.key().as_ref()], bump = book.load()?.bump)]
    pub book: AccountLoader<'info, Book>,
    /// CHECK: the book's USDC account, at its address.
    #[account(mut, seeds = [BOOK_USDC_SEED, market.key().as_ref()], bump = book.load()?.book_usdc_bump)]
    pub book_usdc: UncheckedAccount<'info>,
    /// CHECK: the book's Yes account, at its address.
    #[account(mut, seeds = [BOOK_YES_SEED, market.key().as_ref()], bump = book.load()?.book_yes_bump)]
    pub book_yes: UncheckedAccount<'info>,
    /// CHECK: the book's No account, at its address (D142).
    #[account(mut, seeds = [BOOK_NO_SEED, market.key().as_ref()], bump = book.load()?.book_no_bump)]
    pub book_no: UncheckedAccount<'info>,
    /// CHECK: receives every deposit; must be who created the market.
    #[account(mut, address = market.creator)]
    pub creator: UncheckedAccount<'info>,
    /// CHECK: the creator's own USDC account, which takes any USDC donated to the vault or the book first, so they
    /// can close (D137).
    #[account(mut)]
    pub creator_usdc: UncheckedAccount<'info>,
    /// CHECK: Config's USDC mint.
    #[account(address = config.usdc_mint)]
    pub usdc_mint: UncheckedAccount<'info>,
    /// CHECK: the classic token program.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
    /// CHECK: Token-2022.
    #[account(address = TOKEN_2022_PROGRAM_ID)]
    pub token_2022_program: UncheckedAccount<'info>,
}

pub fn handle_remove_market(_ctx: Context<RemoveMarket>) -> Result<()> {
    err!(MeridianError::NotImplemented)
}

/// The operator, after orders close, cancels every resting order into book balances (D37). A full book needs more
/// than one transaction, since each cancel's event is one of a transaction's 64 instructions (M1.01); each call
/// cancels what fits and the next continues.
#[event_cpi]
#[derive(Accounts)]
pub struct Sweep<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = operator @ MeridianError::NotOperator)]
    pub config: Box<Account<'info, Config>>,
    pub operator: Signer<'info>,
    #[account(
        mut,
        seeds = [MARKET_SEED, market.ticker_bytes(), &market.day.to_le_bytes(), &market.strike_cents.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, seeds = [BOOK_SEED, market.key().as_ref()], bump = book.load()?.bump)]
    pub book: AccountLoader<'info, Book>,
    /// CHECK: the book's USDC account, which takes closed pairs' 1.00 each (D142).
    #[account(mut, seeds = [BOOK_USDC_SEED, market.key().as_ref()], bump = book.load()?.book_usdc_bump)]
    pub book_usdc: UncheckedAccount<'info>,
    /// CHECK: the book's Yes account, at its address.
    #[account(mut, seeds = [BOOK_YES_SEED, market.key().as_ref()], bump = book.load()?.book_yes_bump)]
    pub book_yes: UncheckedAccount<'info>,
    /// CHECK: the book's No account, at its address.
    #[account(mut, seeds = [BOOK_NO_SEED, market.key().as_ref()], bump = book.load()?.book_no_bump)]
    pub book_no: UncheckedAccount<'info>,
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
    /// CHECK: the classic token program.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
    /// CHECK: Token-2022.
    #[account(address = TOKEN_2022_PROGRAM_ID)]
    pub token_2022_program: UncheckedAccount<'info>,
}

pub fn handle_sweep(_ctx: Context<Sweep>) -> Result<()> {
    err!(MeridianError::NotImplemented)
}

/// Anyone sends an owner's whole balance in the book to the owner's own accounts, and nowhere else (D99).
#[event_cpi]
#[derive(Accounts)]
pub struct ReturnToOwner<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(
        seeds = [MARKET_SEED, market.ticker_bytes(), &market.day.to_le_bytes(), &market.strike_cents.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, seeds = [BOOK_SEED, market.key().as_ref()], bump = book.load()?.bump)]
    pub book: AccountLoader<'info, Book>,
    /// CHECK: the book's USDC account, at its address.
    #[account(mut, seeds = [BOOK_USDC_SEED, market.key().as_ref()], bump = book.load()?.book_usdc_bump)]
    pub book_usdc: UncheckedAccount<'info>,
    /// CHECK: the book's Yes account, at its address.
    #[account(mut, seeds = [BOOK_YES_SEED, market.key().as_ref()], bump = book.load()?.book_yes_bump)]
    pub book_yes: UncheckedAccount<'info>,
    /// CHECK: the book's No account, at its address (D142).
    #[account(mut, seeds = [BOOK_NO_SEED, market.key().as_ref()], bump = book.load()?.book_no_bump)]
    pub book_no: UncheckedAccount<'info>,
    /// CHECK: the trader whose balance this is; it need not sign.
    pub owner: UncheckedAccount<'info>,
    /// CHECK: the owner's own USDC account (D139).
    #[account(mut)]
    pub owner_usdc: UncheckedAccount<'info>,
    /// CHECK: the owner's own Yes account (D139).
    #[account(mut)]
    pub owner_yes: UncheckedAccount<'info>,
    /// CHECK: the owner's own No account (D139), for No released from paired offers (D142).
    #[account(mut)]
    pub owner_no: UncheckedAccount<'info>,
    /// CHECK: the market's No mint, at its address.
    #[account(seeds = [NO_SEED, market.key().as_ref()], bump = market.no_bump)]
    pub no_mint: UncheckedAccount<'info>,
    /// CHECK: the market's Yes mint, at its address.
    #[account(seeds = [YES_SEED, market.key().as_ref()], bump = market.yes_bump)]
    pub yes_mint: UncheckedAccount<'info>,
    /// CHECK: Config's USDC mint.
    #[account(address = config.usdc_mint)]
    pub usdc_mint: UncheckedAccount<'info>,
    /// CHECK: the classic token program.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
    /// CHECK: Token-2022.
    #[account(address = TOKEN_2022_PROGRAM_ID)]
    pub token_2022_program: UncheckedAccount<'info>,
}

pub fn handle_return_to_owner(_ctx: Context<ReturnToOwner>) -> Result<()> {
    err!(MeridianError::NotImplemented)
}

/// Anyone closes a settled market's empty book and its token accounts; the deposits go back to the market's creator
/// (D50). Any tokens donated to the book's accounts are moved out first (D137).
#[event_cpi]
#[derive(Accounts)]
pub struct CloseBook<'info> {
    #[account(
        mut,
        seeds = [MARKET_SEED, market.ticker_bytes(), &market.day.to_le_bytes(), &market.strike_cents.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, seeds = [BOOK_SEED, market.key().as_ref()], bump = book.load()?.bump)]
    pub book: AccountLoader<'info, Book>,
    /// CHECK: the book's USDC account, at its address.
    #[account(mut, seeds = [BOOK_USDC_SEED, market.key().as_ref()], bump = book.load()?.book_usdc_bump)]
    pub book_usdc: UncheckedAccount<'info>,
    /// CHECK: the book's Yes account, at its address.
    #[account(mut, seeds = [BOOK_YES_SEED, market.key().as_ref()], bump = book.load()?.book_yes_bump)]
    pub book_yes: UncheckedAccount<'info>,
    /// CHECK: the book's No account, at its address (D142).
    #[account(mut, seeds = [BOOK_NO_SEED, market.key().as_ref()], bump = book.load()?.book_no_bump)]
    pub book_no: UncheckedAccount<'info>,
    /// CHECK: the market's vault, which takes any USDC donated to the book.
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump = market.vault_bump)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: the market's Yes mint: donated Yes are burned before the book's Yes account closes.
    #[account(mut, seeds = [YES_SEED, market.key().as_ref()], bump = market.yes_bump)]
    pub yes_mint: UncheckedAccount<'info>,
    /// CHECK: the market's No mint, likewise.
    #[account(mut, seeds = [NO_SEED, market.key().as_ref()], bump = market.no_bump)]
    pub no_mint: UncheckedAccount<'info>,
    /// CHECK: the USDC mint, read from the vault it must match.
    pub usdc_mint: UncheckedAccount<'info>,
    /// CHECK: receives the deposits; must be who created the market.
    #[account(mut, address = market.creator)]
    pub creator: UncheckedAccount<'info>,
    /// CHECK: the classic token program.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
    /// CHECK: Token-2022.
    #[account(address = TOKEN_2022_PROGRAM_ID)]
    pub token_2022_program: UncheckedAccount<'info>,
}

pub fn handle_close_book(_ctx: Context<CloseBook>) -> Result<()> {
    err!(MeridianError::NotImplemented)
}
