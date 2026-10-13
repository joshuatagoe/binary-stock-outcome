//! Remove market, Sweep, Return to owner and Close book (ARCHITECTURE.md §6, instructions 7, 15, 16 and 17),
//! declared at M1's freeze (P12): their accounts and arguments are the contract. Sweep and Return to owner are built
//! (M2-b); Remove market and Close book return NotImplemented until M3.
use anchor_lang::prelude::*;

use crate::{
    book::{Book, BOOK_NO_SEED, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED},
    errors::MeridianError,
    events::{BalanceReturned, CancelReason, EventWriter, OrderCancelled, Redeemed},
    market::{check_vault, Market, MarketStatus, MARKET_SEED, NO_SEED, USDC_PER_PAIR, VAULT_SEED, YES_SEED},
    pairs::RedeemMode,
    place_order::{check_book, check_book_no},
    token::{self, OUTCOME_DECIMALS, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DECIMALS},
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

/// The most resting orders one sweep takes. Its worst batch is all paired offers: two events each (the cancel, then the
/// pairs closed) and three token calls for the batch, so 1 + 3 + 2 × 28 = 60 of a transaction's 64-instruction trace
/// (M1.01), which leaves room for compute-budget instructions in front of it.
pub const SWEEP_BATCH: usize = 28;

/// Once orders close (D37, D102), or while a decision keeps the market from trading, the operator takes up to
/// SWEEP_BATCH resting orders off the book: offers first, each side from its worst price. A bid's USDC and an offer's
/// Yes move to the owner's balance in the book (D99), and a paired offer's pairs close instead: their Yes and No are
/// burned in the book and 1.00 each moves from the vault to the owner's balance (D142, D143), even after settlement,
/// since a pair is worth 1.00 whichever side wins. The backend calls again until the book is empty; a call on an empty
/// book does nothing and succeeds, so a repeat or a late landing is harmless. Never paused (D68). Events: each order's
/// cancel, reason Sweep, followed for a paired offer by the pairs it closed (Redeemed, pairs).
pub fn handle_sweep(ctx: Context<Sweep>) -> Result<()> {
    let a = &ctx.accounts;
    let orders_close = a.market.close - a.config.thresholds.orders_close_before_secs as i64;
    let closed = Clock::get()?.unix_timestamp >= orders_close || a.market.status != MarketStatus::Trading;
    require!(closed, MeridianError::BeforeClose);
    let (removed, book_bump) = {
        let mut book = a.book.load_mut()?;
        (book.sweep(SWEEP_BATCH), book.bump)
    };
    let pairs: u64 = removed.iter().filter(|r| r.paired).map(|r| r.quantity as u64).sum();

    let market = a.market.key();
    if pairs > 0 {
        let (day, strike, market_bump) = (a.market.day.to_le_bytes(), a.market.strike_cents.to_le_bytes(), [a.market.bump]);
        let market_seeds = a.market.signer_seeds(&day, &strike, &market_bump);
        let market_signer: &[&[u8]] = &market_seeds;
        let book_bump = [book_bump];
        let book_signer: &[&[u8]] = &[BOOK_SEED, market.as_ref(), &book_bump];
        let (classic, t22) = (a.token_program.to_account_info(), a.token_2022_program.to_account_info());
        let (market_info, book_info) = (a.market.to_account_info(), a.book.to_account_info());
        token::permissioned_burn(&t22, &a.book_yes, &a.yes_mint, &market_info, &book_info, pairs, &[market_signer, book_signer])?;
        token::permissioned_burn(&t22, &a.book_no, &a.no_mint, &market_info, &book_info, pairs, &[market_signer, book_signer])?;
        token::transfer(&classic, &a.vault, &a.usdc_mint, &a.book_usdc, &market_info, pairs * USDC_PER_PAIR, USDC_DECIMALS, &[market_signer])?;
        let m = &mut ctx.accounts.market;
        m.owed = m.owed.checked_sub(pairs).ok_or(MeridianError::SupplyOverOwed)?;
    }

    let mut events = EventWriter::new(ctx.accounts.event_authority.to_account_info());
    for r in &removed {
        let (owner, quantity) = (r.owner, r.quantity);
        events.emit(&OrderCancelled { market, owner, order_id: r.order_id, side: r.side, price: r.price, quantity, reason: CancelReason::Sweep })?;
        if r.paired {
            let pairs = quantity as u64;
            events.emit(&Redeemed { market, owner, mode: RedeemMode::Pairs, quantity: pairs, usdc: pairs * USDC_PER_PAIR })?;
        }
    }
    let a = &ctx.accounts;
    check_vault(&a.market, &a.vault, &a.yes_mint, &a.no_mint)?;
    check_book(&a.book, &a.book_usdc, &a.book_yes)?;
    check_book_no(&a.book, &a.book_no)
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

/// Any time, never paused (D68, D99): the owner's whole balance in the book, USDC, Yes and No released from paired
/// offers (D142), goes to the owner's own token accounts. Only an account that receives something is used, and it must
/// be the owner's, so a closed account the return doesn't need can't block it. With nothing to return it is refused,
/// so a repeat finds nothing (§3). With no orders left, the owner's entry is free for the next trader (D107). Event:
/// BalanceReturned with all three amounts (D144).
pub fn handle_return_to_owner(ctx: Context<ReturnToOwner>) -> Result<()> {
    let a = &ctx.accounts;
    let owner = a.owner.key();
    // D30: no account passed twice, and none of the book's own accounts passed as the owner's.
    let keys = [a.owner_usdc.key(), a.owner_yes.key(), a.owner_no.key(), a.book_usdc.key(), a.book_yes.key(), a.book_no.key()];
    for (i, key) in keys.iter().enumerate() {
        require!(!keys[i + 1..].contains(key), MeridianError::DuplicateAccount);
    }
    let ((usdc, yes, no), book_bump) = {
        let mut book = a.book.load_mut()?;
        (book.take_balance(&owner), book.bump)
    };
    require!(usdc > 0 || yes > 0 || no > 0, MeridianError::InvalidQuantity);
    for (account, amount) in [(&a.owner_usdc, usdc), (&a.owner_yes, yes), (&a.owner_no, no)] {
        if amount > 0 {
            require_keys_eq!(token::owner(account)?, owner, MeridianError::NotYourAccount);
        }
    }

    let market = a.market.key();
    let book_bump = [book_bump];
    let book_signer: &[&[u8]] = &[BOOK_SEED, market.as_ref(), &book_bump];
    let (classic, t22, book) = (a.token_program.to_account_info(), a.token_2022_program.to_account_info(), a.book.to_account_info());
    token::transfer(&classic, &a.book_usdc, &a.usdc_mint, &a.owner_usdc, &book, usdc, USDC_DECIMALS, &[book_signer])?;
    token::transfer(&t22, &a.book_yes, &a.yes_mint, &a.owner_yes, &book, yes, OUTCOME_DECIMALS, &[book_signer])?;
    token::transfer(&t22, &a.book_no, &a.no_mint, &a.owner_no, &book, no, OUTCOME_DECIMALS, &[book_signer])?;

    EventWriter::new(ctx.accounts.event_authority.to_account_info()).emit(&BalanceReturned { market, owner, usdc, yes, no })?;
    let a = &ctx.accounts;
    check_book(&a.book, &a.book_usdc, &a.book_yes)?;
    check_book_no(&a.book, &a.book_no)
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
