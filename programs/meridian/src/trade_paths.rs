//! Buy No, Sell No and Replace quotes (ARCHITECTURE.md §6, instructions 11, 12 and 14), declared at M1's freeze
//! (P12): their accounts and arguments are the contract. Buy No and Sell No are built in M2-a, Replace quotes in M2-b.
use anchor_lang::{error::ErrorCode, prelude::*};

use crate::{
    book::{Book, OrderKind, PlaceOrderArgs, Side, BOOK_NO_SEED, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED},
    errors::MeridianError,
    events::{BalanceReturned, CancelReason, EventWriter, OrderCancelled, OrderPlaced, PairsMinted, Redeemed},
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

/// The accounts each listed book adds to the remaining accounts, in BookQuotes' order.
pub const ACCOUNTS_PER_BOOK: usize = 6;

/// Not paused, and every listed market within its order window, as Place order (D37, D68, D102); one market outside it
/// refuses the whole batch. On each book, in the order listed: the maker's plain orders are cancelled into its balance
/// there, its new quotes are placed as Limit orders under Place order's rules (§3, D111), so a quote that crosses the
/// book trades first, and its free USDC and Yes are collected. Its paired offers stay, and so does a free No balance,
/// for Return to owner (D142). Only the difference between what the new quotes lock and buy and what comes back moves
/// between the maker's accounts and the book. Every account of a listed book is checked to be that market's, and the
/// maker's to be its own (D30, D139). Events per book: each cancel (reason Owner), each quote's fills and self-trade
/// cancels and its OrderPlaced, then BalanceReturned for what was collected, so the events alone give every balance in
/// the book (D62).
pub fn handle_replace_quotes<'info>(ctx: Context<'info, ReplaceQuotes<'info>>, books: Vec<BookQuotes>) -> Result<()> {
    let a = &ctx.accounts;
    require!(!a.config.paused, MeridianError::Paused);
    let remaining = ctx.remaining_accounts;
    require!(remaining.len() >= books.len() * ACCOUNTS_PER_BOOK, ErrorCode::AccountNotEnoughKeys);
    let markets: Vec<Pubkey> = (0..books.len()).map(|i| remaining[i * ACCOUNTS_PER_BOOK].key()).collect();
    for (i, market) in markets.iter().enumerate() {
        require!(!markets[i + 1..].contains(market), MeridianError::DuplicateAccount);
    }
    let mut events = EventWriter::new(a.event_authority.to_account_info());
    for (i, book_quotes) in books.iter().enumerate() {
        let accounts = &remaining[i * ACCOUNTS_PER_BOOK..(i + 1) * ACCOUNTS_PER_BOOK];
        replace_on_book(a, accounts, &book_quotes.quotes, &mut events)?;
    }
    Ok(())
}

/// One book of Replace quotes: `accounts` are the market, its book, the book's USDC and Yes accounts, the Yes mint and
/// the maker's own Yes account.
fn replace_on_book<'info>(a: &ReplaceQuotes<'info>, accounts: &'info [AccountInfo<'info>], quotes: &[Quote], events: &mut EventWriter<'info>) -> Result<()> {
    let [market_info, book_info, book_usdc, book_yes, yes_mint, maker_yes] = accounts else {
        return err!(ErrorCode::AccountNotEnoughKeys);
    };
    let market = Account::<Market>::try_from(market_info)?;
    check_order_window(&market, &a.config)?;
    let (maker, market_key) = (a.maker.key(), market_info.key());
    let (maker_info, maker_usdc) = (a.maker.to_account_info(), a.maker_usdc.to_account_info());
    require!(maker_usdc.key() != book_usdc.key() && maker_yes.key() != book_yes.key(), MeridianError::DuplicateAccount);
    for account in [&maker_usdc, maker_yes] {
        require_keys_eq!(token::owner(account)?, maker, MeridianError::NotYourAccount);
    }

    // The book is this market's, and its token accounts and the Yes mint sit at their addresses (§5).
    let book = AccountLoader::<Book>::try_from(book_info)?;
    let (book_bump, usdc_bump, yes_bump) = {
        let b = book.load()?;
        require_keys_eq!(b.market, market_key, ErrorCode::ConstraintSeeds);
        (b.bump, b.book_usdc_bump, b.book_yes_bump)
    };
    for (account, seed, bump) in [(book_usdc, BOOK_USDC_SEED, usdc_bump), (book_yes, BOOK_YES_SEED, yes_bump), (yes_mint, YES_SEED, market.yes_bump)] {
        let address = Pubkey::create_program_address(&[seed, market_key.as_ref(), &[bump]], &crate::ID).map_err(|_| ErrorCode::ConstraintSeeds)?;
        require_keys_eq!(account.key(), address, ErrorCode::ConstraintSeeds);
    }

    let (cancelled, placed, (free_usdc, free_yes)) = {
        let mut b = book.load_mut()?;
        let cancelled = b.cancel_plain(&maker);
        let mut placed = Vec::with_capacity(quotes.len());
        for q in quotes {
            let args = PlaceOrderArgs { side: q.side, kind: OrderKind::Limit, price: q.price, quantity: q.quantity, order_id: q.order_id };
            let placement = b.place(&maker, &args, a.config.fill_limit)?;
            placed.push((args, placement));
        }
        (cancelled, placed, b.take_usdc_and_yes(&maker))
    };

    // The maker's side, netted: what its quotes lock and buy goes in; what they sell, what its own cancelled orders
    // return (D90) and its collected balance come out.
    let usdc_in: u64 = placed.iter().map(|(args, p)| p.usdc_in(args)).sum();
    let usdc_out: u64 = placed.iter().map(|(args, p)| p.usdc_out(args)).sum::<u64>() + free_usdc;
    let yes_in: u64 = placed.iter().map(|(args, p)| p.yes_in(args)).sum();
    let yes_out: u64 = placed.iter().map(|(args, p)| p.yes_out(args)).sum::<u64>() + free_yes;
    let book_bump = [book_bump];
    let book_signer: &[&[u8]] = &[BOOK_SEED, market_key.as_ref(), &book_bump];
    let (classic, t22) = (a.token_program.to_account_info(), a.token_2022_program.to_account_info());
    let usdc_mint = a.usdc_mint.to_account_info();
    if usdc_in > usdc_out {
        token::transfer(&classic, &maker_usdc, &usdc_mint, book_usdc, &maker_info, usdc_in - usdc_out, USDC_DECIMALS, &[])?;
    } else {
        token::transfer(&classic, book_usdc, &usdc_mint, &maker_usdc, book_info, usdc_out - usdc_in, USDC_DECIMALS, &[book_signer])?;
    }
    if yes_in > yes_out {
        token::transfer(&t22, maker_yes, yes_mint, book_yes, &maker_info, yes_in - yes_out, OUTCOME_DECIMALS, &[])?;
    } else {
        token::transfer(&t22, book_yes, yes_mint, maker_yes, book_info, yes_out - yes_in, OUTCOME_DECIMALS, &[book_signer])?;
    }

    for c in &cancelled {
        events.emit(&OrderCancelled {
            market: market_key,
            owner: maker,
            order_id: c.order_id,
            side: c.side,
            price: c.price,
            quantity: c.quantity,
            reason: CancelReason::Owner,
        })?;
    }
    for (args, p) in &placed {
        emit_matches(events, market_key, maker, args.order_id, args.side, &p.matches)?;
        if p.rested > 0 {
            events.emit(&OrderPlaced { market: market_key, owner: maker, order_id: args.order_id, side: args.side, price: args.price, quantity: p.rested })?;
        }
    }
    if free_usdc > 0 || free_yes > 0 {
        events.emit(&BalanceReturned { market: market_key, owner: maker, usdc: free_usdc, yes: free_yes, no: 0 })?;
    }
    check_book(&book, book_usdc, book_yes)
}
