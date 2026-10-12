//! Place order and Cancel order (ARCHITECTURE.md §6, instructions 10 and 13): matching on the market's book within
//! its trading window, the taker's tokens moved straight to and from its own wallet, makers credited in the book
//! (D99), events in match order, and the book's balance checked after each (D137).
use anchor_lang::prelude::*;

use crate::{
    book::{Book, Match, PlaceOrderArgs, Side, BOOK_NO_SEED, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED},
    errors::MeridianError,
    events::{CancelReason, EventWriter, Fill, OrderCancelled, OrderPlaced, Redeemed},
    market::{check_vault, Market, MarketStatus, MARKET_SEED, NO_SEED, USDC_PER_PAIR, VAULT_SEED, YES_SEED},
    pairs::RedeemMode,
    token::{self, OUTCOME_DECIMALS, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DECIMALS},
    Config, CONFIG_SEED,
};

#[event_cpi]
#[derive(Accounts)]
pub struct PlaceOrder<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(
        seeds = [MARKET_SEED, market.ticker_bytes(), &market.day.to_le_bytes(), &market.strike_cents.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, Market>>,
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
    /// CHECK: the market's Yes mint, at its address. TransferChecked also refuses a token account of any other mint, and
    /// one not owned by the token program it is sent to, which covers §5's token-account rule for every account here.
    #[account(seeds = [YES_SEED, market.key().as_ref()], bump = market.yes_bump)]
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
    check_order_window(&ctx.accounts.market, &ctx.accounts.config)?;
    for account in [&ctx.accounts.taker_usdc, &ctx.accounts.taker_yes] {
        require_keys_eq!(token::owner(account)?, ctx.accounts.taker.key(), MeridianError::NotYourAccount);
    }
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
    emit_matches(&mut events, market, taker, args.order_id, args.side, &placement.matches)?;
    if placement.rested > 0 {
        events.emit(&OrderPlaced { market, owner: taker, order_id: args.order_id, side: args.side, price: args.price, quantity: placement.rested })?;
    }
    check_book(&ctx.accounts.book, &ctx.accounts.book_usdc, &ctx.accounts.book_yes)
}

/// One event per resting order the taker's order reached, in the order reached (D90): a fill, or the cancel of the
/// taker's own order. `side` is what the taker did with Yes.
pub fn emit_matches(events: &mut EventWriter<'_>, market: Pubkey, taker: Pubkey, taker_order_id: u64, side: Side, matches: &[Match]) -> Result<()> {
    for m in matches {
        match m {
            Match::Fill(f) => events.emit(&Fill {
                market,
                maker: f.maker,
                maker_order_id: f.maker_order_id,
                taker,
                taker_order_id,
                side,
                price: f.price,
                quantity: f.quantity,
            })?,
            Match::SelfTrade(s) => events.emit(&OrderCancelled {
                market,
                owner: taker,
                order_id: s.order_id,
                side: side.opposite(),
                price: s.price,
                quantity: s.quantity,
                reason: CancelReason::SelfTrade,
            })?,
        }
    }
    Ok(())
}

/// The book's token accounts hold at least what its orders lock plus its owners' free balances (§5, D64). At least,
/// not exactly: anyone can send tokens to an account, and a donation must not stop the market.
pub fn check_book(book: &AccountLoader<Book>, book_usdc: &AccountInfo, book_yes: &AccountInfo) -> Result<()> {
    let b = book.load()?;
    require!(token::amount(book_usdc)? >= b.locked_usdc() + b.free_usdc(), MeridianError::BookShort);
    require!(token::amount(book_yes)? >= b.locked_yes() + b.free_yes(), MeridianError::BookShort);
    Ok(())
}

/// Likewise for the book's No account: its paired offers' No plus the No released to their owners (D137, D142).
pub fn check_book_no(book: &AccountLoader<Book>, book_no: &AccountInfo) -> Result<()> {
    let b = book.load()?;
    require!(token::amount(book_no)? >= b.locked_no() + b.free_no(), MeridianError::BookShort);
    Ok(())
}

/// Orders are taken from the open until 5 seconds before the stored close, by the chain's clock (D37, D46, D102).
pub fn check_order_window(market: &Market, config: &Config) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(now >= market.open, MeridianError::NotOpenYet);
    let orders_close = market.close - config.thresholds.orders_close_before_secs as i64;
    require!(now < orders_close && market.status == MarketStatus::Trading, MeridianError::OrdersClosed);
    Ok(())
}

/// The vault, the mints and the book's token accounts are listed for a paired offer, whose cancel closes its pairs
/// and credits their 1.00 each to the owner's balance (D39, D142).
#[event_cpi]
#[derive(Accounts)]
pub struct CancelOrder<'info> {
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
    pub owner: Signer<'info>,
    /// CHECK: the book's USDC account, at its address.
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

/// Any time while the order rests, never paused (D68): what it locked moves to the owner's balance in the book, which
/// Return to owner then pays out (D99). For a plain order no tokens move, so the book's balance holds as it was. A
/// paired offer's unsold pairs close instead (D39, D142): their Yes and No are burned in the book, and 1.00 each moves
/// from the vault to the owner's balance there, so the vault and the book are checked after. That holds after the
/// close and after settlement too, since a pair is worth 1.00 whichever side wins. Events: the cancel, then for a
/// paired offer the pairs closed (Redeemed, pairs), so the events alone account for the vault and the supplies (D62).
pub fn handle_cancel_order(ctx: Context<CancelOrder>, order_id: u64) -> Result<()> {
    let owner = ctx.accounts.owner.key();
    let ((side, price, quantity, paired), book_bump) = {
        let mut book = ctx.accounts.book.load_mut()?;
        (book.cancel(&owner, order_id)?, book.bump)
    };
    let market = ctx.accounts.market.key();
    let pairs = quantity as u64;
    if paired {
        let a = &ctx.accounts;
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
    events.emit(&OrderCancelled { market, owner, order_id, side, price, quantity, reason: CancelReason::Owner })?;
    if paired {
        events.emit(&Redeemed { market, owner, mode: RedeemMode::Pairs, quantity: pairs, usdc: pairs * USDC_PER_PAIR })?;
        let a = &ctx.accounts;
        check_vault(&a.market, &a.vault, &a.yes_mint, &a.no_mint)?;
        check_book(&a.book, &a.book_usdc, &a.book_yes)?;
        check_book_no(&a.book, &a.book_no)?;
    }
    Ok(())
}

