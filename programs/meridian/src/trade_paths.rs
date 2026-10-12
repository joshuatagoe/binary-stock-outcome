//! Buy No, Sell No and Replace quotes (ARCHITECTURE.md §6, instructions 11, 12 and 14), declared at M1's freeze
//! (P12): their accounts and arguments are the contract; the program lane builds the bodies in M2.
use anchor_lang::prelude::*;

use crate::{
    book::{Book, OrderKind, Side, BOOK_NO_SEED, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED},
    errors::MeridianError,
    market::{Market, MARKET_SEED, NO_SEED, VAULT_SEED, YES_SEED},
    token::{TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID},
    Config, CONFIG_SEED,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct BuyNoArgs {
    pub kind: OrderKind,
    /// The most the taker pays per No, in cents: it sells each new pair's Yes for at least 100 minus this (D15).
    pub price: u8,
    pub quantity: u32,
    pub order_id: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct SellNoArgs {
    /// The most it pays per Yes bought, in cents; Sell No never rests (D38).
    pub price: u8,
    pub quantity: u32,
}

/// Mints pairs and sells their Yes, keeping the No (D5); a Limit order's unsold Yes rests as an offer, and cancelling it
/// closes those pairs (D39). Also Sell No: buys Yes from offers and closes each with a No for 1.00 (D38).
#[event_cpi]
#[derive(Accounts)]
pub struct NoTrade<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
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
    /// CHECK: the book's No account, where a Buy No limit order's unsold pairs keep their No (D142).
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
    #[account(mut)]
    pub taker: Signer<'info>,
    /// CHECK: the taker's own USDC account (D139).
    #[account(mut, constraint = taker_usdc.key() != vault.key() && taker_usdc.key() != book_usdc.key() @ MeridianError::DuplicateAccount)]
    pub taker_usdc: UncheckedAccount<'info>,
    /// CHECK: the taker's own Yes account (D139), for its own offers that a Sell No reaches (D90).
    #[account(mut)]
    pub taker_yes: UncheckedAccount<'info>,
    /// CHECK: the taker's own No account (D139).
    #[account(mut, constraint = taker_no.key() != taker_yes.key() @ MeridianError::DuplicateAccount)]
    pub taker_no: UncheckedAccount<'info>,
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

pub fn handle_buy_no(_ctx: Context<NoTrade>, _args: BuyNoArgs) -> Result<()> {
    err!(MeridianError::NotImplemented)
}

pub fn handle_sell_no(_ctx: Context<NoTrade>, _args: SellNoArgs) -> Result<()> {
    err!(MeridianError::NotImplemented)
}

/// One order in a maker's batch.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct Quote {
    pub side: Side,
    pub price: u8,
    pub quantity: u32,
    pub order_id: u64,
}

/// The new orders for one book. The books' accounts follow in the remaining accounts, six per book in this order:
/// the market, its book, the book's USDC and Yes accounts, the Yes mint, and the maker's own Yes account. Replace
/// quotes cancels the maker's plain orders only; a paired offer stays until Cancel order or the sweep (D142).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct BookQuotes {
    pub quotes: Vec<Quote>,
}

/// Cancels the signer's orders on each listed book, places the new ones and collects the signer's free balances
/// (D111). Used by the bot, open to any maker.
#[event_cpi]
#[derive(Accounts)]
pub struct ReplaceQuotes<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    pub maker: Signer<'info>,
    /// CHECK: the maker's own USDC account (D139).
    #[account(mut)]
    pub maker_usdc: UncheckedAccount<'info>,
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

pub fn handle_replace_quotes(_ctx: Context<ReplaceQuotes>, _books: Vec<BookQuotes>) -> Result<()> {
    err!(MeridianError::NotImplemented)
}
