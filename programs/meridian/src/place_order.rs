//! Place order (ARCHITECTURE.md §6, instruction 10), in M1-a's form for the order-book spike (D21): the matching, the
//! token moves, the events and the book check, without the market account and its trading window, which arrive with
//! Create market (M1-b) and the full instruction (M1-c).
use anchor_lang::prelude::*;

use crate::{
    book::{Book, Match, PlaceOrderArgs, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED},
    errors::MeridianError,
    events::{CancelReason, EventWriter, Fill, OrderCancelled, OrderPlaced},
    token::{self, OUTCOME_DECIMALS, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DECIMALS},
    Config, CONFIG_SEED,
};

#[event_cpi]
#[derive(Accounts)]
pub struct PlaceOrder<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    /// CHECK: the market's address, which the book's addresses come from. Its account and trading window arrive with
    /// Create market (M1-b) and the full Place order (M1-c).
    pub market: UncheckedAccount<'info>,
    #[account(mut, seeds = [BOOK_SEED, market.key().as_ref()], bump = book.load()?.bump)]
    pub book: AccountLoader<'info, Book>,
    /// CHECK: the book's USDC account, at its own address; the token program checks its mint on every transfer.
    #[account(mut, seeds = [BOOK_USDC_SEED, market.key().as_ref()], bump = book.load()?.book_usdc_bump)]
    pub book_usdc: UncheckedAccount<'info>,
    /// CHECK: the book's Yes account, likewise.
    #[account(mut, seeds = [BOOK_YES_SEED, market.key().as_ref()], bump = book.load()?.book_yes_bump)]
    pub book_yes: UncheckedAccount<'info>,
    #[account(mut)]
    pub taker: Signer<'info>,
    /// CHECK: the taker's USDC account; the token program checks its owner and mint on every transfer.
    #[account(mut, constraint = taker_usdc.key() != book_usdc.key() @ MeridianError::DuplicateAccount)]
    pub taker_usdc: UncheckedAccount<'info>,
    /// CHECK: the taker's Yes account, likewise.
    #[account(mut, constraint = taker_yes.key() != book_yes.key() @ MeridianError::DuplicateAccount)]
    pub taker_yes: UncheckedAccount<'info>,
    /// CHECK: Config's USDC mint.
    #[account(address = config.usdc_mint)]
    pub usdc_mint: UncheckedAccount<'info>,
    /// CHECK: the market's Yes mint; TransferChecked refuses any other. Its address is fixed by Create market (M1-b).
    pub yes_mint: UncheckedAccount<'info>,
    /// CHECK: the classic token program, for USDC.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
    /// CHECK: Token-2022, for Yes.
    #[account(address = TOKEN_2022_PROGRAM_ID)]
    pub token_2022_program: UncheckedAccount<'info>,
}

pub fn handle_place_order(ctx: Context<PlaceOrder>, args: PlaceOrderArgs) -> Result<()> {
    require!(!ctx.accounts.config.paused, MeridianError::Paused);
    let market = ctx.accounts.market.key();
    let taker = ctx.accounts.taker.key();
    let (placement, bump) = {
        let mut book = ctx.accounts.book.load_mut()?;
        (book.place(&taker, &args, ctx.accounts.config.fill_limit)?, book.bump)
    };

    // The taker's side moves straight to and from its wallet, with what its own cancelled orders locked (D90);
    // makers' proceeds stay in the book (D99).
    let a = &ctx.accounts;
    let book_seeds: &[&[u8]] = &[BOOK_SEED, market.as_ref(), &[bump]];
    let (usdc, t22, book) = (a.token_program.to_account_info(), a.token_2022_program.to_account_info(), a.book.to_account_info());
    token::transfer(&usdc, &a.taker_usdc, &a.usdc_mint, &a.book_usdc, &a.taker, placement.usdc_in(&args), USDC_DECIMALS, &[])?;
    token::transfer(&t22, &a.taker_yes, &a.yes_mint, &a.book_yes, &a.taker, placement.yes_in(&args), OUTCOME_DECIMALS, &[])?;
    token::transfer(&usdc, &a.book_usdc, &a.usdc_mint, &a.taker_usdc, &book, placement.usdc_out(&args), USDC_DECIMALS, &[book_seeds])?;
    token::transfer(&t22, &a.book_yes, &a.yes_mint, &a.taker_yes, &book, placement.yes_out(&args), OUTCOME_DECIMALS, &[book_seeds])?;

    let mut events = EventWriter::new(ctx.accounts.event_authority.to_account_info());
    for m in &placement.matches {
        match m {
            Match::Fill(f) => events.emit(&Fill {
                market,
                maker: f.maker,
                maker_order_id: f.maker_order_id,
                taker,
                taker_order_id: args.order_id,
                side: args.side,
                price: f.price,
                quantity: f.quantity,
            })?,
            Match::SelfTrade(s) => events.emit(&OrderCancelled {
                market,
                owner: taker,
                order_id: s.order_id,
                side: args.side.opposite(),
                price: s.price,
                quantity: s.quantity,
                reason: CancelReason::SelfTrade,
            })?,
        }
    }
    if placement.rested > 0 {
        events.emit(&OrderPlaced { market, owner: taker, order_id: args.order_id, side: args.side, price: args.price, quantity: placement.rested })?;
    }
    check_book(&ctx.accounts.book, &ctx.accounts.book_usdc, &ctx.accounts.book_yes)
}

/// The book's token accounts hold at least what its orders lock plus its owners' free balances (§5, D64). At least,
/// not exactly: anyone can send tokens to an account, and a donation must not stop the market.
pub fn check_book(book: &AccountLoader<Book>, book_usdc: &AccountInfo, book_yes: &AccountInfo) -> Result<()> {
    let b = book.load()?;
    require!(token::amount(book_usdc)? >= b.locked_usdc() + b.free_usdc(), MeridianError::BookShort);
    require!(token::amount(book_yes)? >= b.locked_yes() + b.free_yes(), MeridianError::BookShort);
    Ok(())
}
