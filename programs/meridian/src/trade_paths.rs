//! Buy No, Sell No and Replace quotes (ARCHITECTURE.md §6, instructions 11, 12 and 14), declared at M1's freeze
//! (P12): their accounts and arguments are the contract. Buy No and Sell No are built (M2-a); Replace quotes returns
//! NotImplemented until its slice.
use anchor_lang::prelude::*;

use crate::{
    book::{Book, OrderKind, PlaceOrderArgs, Side, BOOK_NO_SEED, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED},
    errors::MeridianError,
    events::{EventWriter, OrderPlaced, PairsMinted, Redeemed},
    market::{check_vault, Market, MARKET_SEED, NO_SEED, USDC_PER_PAIR, VAULT_SEED, YES_SEED},
    pairs::RedeemMode,
    place_order::{check_book, check_book_no, check_order_window, emit_matches},
    token::{self, OUTCOME_DECIMALS, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DECIMALS},
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

/// Within the order window and not paused, as Place order (D37, D68, D102). The taker's new pairs' Yes are sold into
/// the bids at no less than 100 minus its No price; it mints only the pairs it sells, plus a Limit order's unsold
/// pairs, which rest as a paired offer (D5, D142). Each pair puts 1.00 into the vault. The Yes go to the book, for the
/// bidders and the paired offer; the No go to the taker, and a paired offer's to the book's No account. The bids' USDC
/// comes to the taker first, with its own cancelled bids' (D90), so it needs only the net price of its No. Events: the
/// pairs minted, then each resting order reached, in order, then the paired offer placed.
pub fn handle_buy_no(ctx: Context<NoTrade>, args: BuyNoArgs) -> Result<()> {
    let a = &ctx.accounts;
    require!(!a.config.paused, MeridianError::Paused);
    check_order_window(&a.market, &a.config)?;
    require!((1..=99).contains(&args.price), MeridianError::InvalidPrice);
    let taker = a.taker.key();
    for account in [&a.taker_usdc, &a.taker_no] {
        require_keys_eq!(token::owner(account)?, taker, MeridianError::NotYourAccount);
    }
    let yes = PlaceOrderArgs { side: Side::Sell, kind: args.kind, price: 100 - args.price, quantity: args.quantity, order_id: args.order_id };
    let (p, book_bump) = {
        let mut book = a.book.load_mut()?;
        (book.place_paired(&taker, &yes, a.config.fill_limit)?, book.bump)
    };
    let (sold, rested) = (p.filled as u64, p.rested as u64);
    let pairs = sold + rested;

    let market = a.market.key();
    let (day, strike, market_bump) = (a.market.day.to_le_bytes(), a.market.strike_cents.to_le_bytes(), [a.market.bump]);
    let market_seeds = a.market.signer_seeds(&day, &strike, &market_bump);
    let market_signer: &[&[u8]] = &market_seeds;
    let book_bump = [book_bump];
    let book_signer: &[&[u8]] = &[BOOK_SEED, market.as_ref(), &book_bump];
    let (classic, t22) = (a.token_program.to_account_info(), a.token_2022_program.to_account_info());
    let (market_info, book_info) = (a.market.to_account_info(), a.book.to_account_info());
    token::transfer(&classic, &a.book_usdc, &a.usdc_mint, &a.taker_usdc, &book_info, p.fill_usdc + p.returned, USDC_DECIMALS, &[book_signer])?;
    token::transfer(&classic, &a.taker_usdc, &a.usdc_mint, &a.vault, &a.taker, pairs * USDC_PER_PAIR, USDC_DECIMALS, &[])?;
    token::mint_to(&t22, &a.yes_mint, &a.book_yes, &market_info, pairs, &[market_signer])?;
    token::mint_to(&t22, &a.no_mint, &a.taker_no, &market_info, sold, &[market_signer])?;
    token::mint_to(&t22, &a.no_mint, &a.book_no, &market_info, rested, &[market_signer])?;
    let m = &mut ctx.accounts.market;
    m.owed = m.owed.checked_add(pairs).ok_or(MeridianError::InvalidQuantity)?;

    let mut events = EventWriter::new(ctx.accounts.event_authority.to_account_info());
    if pairs > 0 {
        events.emit(&PairsMinted { market, owner: taker, quantity: pairs })?;
    }
    emit_matches(&mut events, market, taker, args.order_id, Side::Sell, &p.matches)?;
    if p.rested > 0 {
        events.emit(&OrderPlaced { market, owner: taker, order_id: args.order_id, side: Side::Sell, price: yes.price, quantity: p.rested })?;
    }
    check_trade(ctx.accounts)
}

/// Within the order window and not paused, as Place order. Buys Yes from offers at no more than `args.price` and
/// closes each with one of the taker's No for 1.00 (D38); it never rests. The Yes bought never leave the book: they are
/// burned there. The vault's 1.00s come to the taker first, so a taker holding only No can pay for the Yes. The
/// taker's own offers it reaches are cancelled (D90): a plain offer's Yes go back to the taker's Yes account, which is
/// used only then, and a paired offer's Yes and No to its balance in the book (D142). Events: each resting order
/// reached, in order, then the pairs closed. Sell No has no order ID, so its fills name 0 as the taker's.
pub fn handle_sell_no(ctx: Context<NoTrade>, args: SellNoArgs) -> Result<()> {
    let a = &ctx.accounts;
    require!(!a.config.paused, MeridianError::Paused);
    check_order_window(&a.market, &a.config)?;
    let taker = a.taker.key();
    for account in [&a.taker_usdc, &a.taker_no] {
        require_keys_eq!(token::owner(account)?, taker, MeridianError::NotYourAccount);
    }
    let (p, book_bump) = {
        let mut book = a.book.load_mut()?;
        (book.take(&taker, Side::Buy, args.price, args.quantity, a.config.fill_limit)?, book.bump)
    };
    if p.returned > 0 {
        require_keys_eq!(token::owner(&a.taker_yes)?, taker, MeridianError::NotYourAccount);
    }
    let pairs = p.filled as u64;
    let usdc = pairs * USDC_PER_PAIR;

    let market = a.market.key();
    let (day, strike, market_bump) = (a.market.day.to_le_bytes(), a.market.strike_cents.to_le_bytes(), [a.market.bump]);
    let market_seeds = a.market.signer_seeds(&day, &strike, &market_bump);
    let market_signer: &[&[u8]] = &market_seeds;
    let book_bump = [book_bump];
    let book_signer: &[&[u8]] = &[BOOK_SEED, market.as_ref(), &book_bump];
    let (classic, t22) = (a.token_program.to_account_info(), a.token_2022_program.to_account_info());
    let (market_info, book_info) = (a.market.to_account_info(), a.book.to_account_info());
    token::transfer(&classic, &a.vault, &a.usdc_mint, &a.taker_usdc, &market_info, usdc, USDC_DECIMALS, &[market_signer])?;
    token::transfer(&classic, &a.taker_usdc, &a.usdc_mint, &a.book_usdc, &a.taker, p.fill_usdc, USDC_DECIMALS, &[])?;
    token::transfer(&t22, &a.book_yes, &a.yes_mint, &a.taker_yes, &book_info, p.returned, OUTCOME_DECIMALS, &[book_signer])?;
    token::permissioned_burn(&t22, &a.book_yes, &a.yes_mint, &market_info, &book_info, pairs, &[market_signer, book_signer])?;
    token::permissioned_burn(&t22, &a.taker_no, &a.no_mint, &market_info, &a.taker, pairs, &[market_signer])?;
    let m = &mut ctx.accounts.market;
    m.owed = m.owed.checked_sub(pairs).ok_or(MeridianError::SupplyOverOwed)?;

    let mut events = EventWriter::new(ctx.accounts.event_authority.to_account_info());
    emit_matches(&mut events, market, taker, 0, Side::Buy, &p.matches)?;
    if pairs > 0 {
        events.emit(&Redeemed { market, owner: taker, mode: RedeemMode::Pairs, quantity: pairs, usdc })?;
    }
    check_trade(ctx.accounts)
}

/// After Buy No and Sell No: the vault holds what is owed and no supply exceeds it (D64), and the book's three token
/// accounts hold what it locks and owes (D137, D142).
fn check_trade(a: &NoTrade) -> Result<()> {
    check_vault(&a.market, &a.vault, &a.yes_mint, &a.no_mint)?;
    check_book(&a.book, &a.book_usdc, &a.book_yes)?;
    check_book_no(&a.book, &a.book_no)
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
