//! A market and Create market (ARCHITECTURE.md §4, §5; §6 instruction 6): one stock, one trading day, one strike,
//! with its Yes and No mints, its vault and its order book. Upcoming, Open and Closed are worked out from the stored
//! times and the chain's clock and never stored; only decisions are (Under review, Proposed, Settled).
use anchor_lang::prelude::*;

use crate::{
    book::{Book, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED},
    errors::MeridianError,
    token::TOKEN_PROGRAM_ID,
    Config, CONFIG_SEED,
};

pub const MARKET_SEED: &[u8] = b"market";
pub const YES_SEED: &[u8] = b"yes";
pub const NO_SEED: &[u8] = b"no";
pub const VAULT_SEED: &[u8] = b"vault";
/// One pair is backed by 1.00 USDC, in its smallest units (D2).
pub const USDC_PER_PAIR: u64 = 1_000_000;

/// What a decision has made of the market. Before any decision it is Trading, and the clock says whether that means
/// Upcoming, Open or Closed (§4).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum MarketStatus {
    Trading,
    UnderReview,
    Proposed,
    Settled,
}

/// Why a market is Under review (D59, D68, D83).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum HoldReason {
    None,
    BandOnStrike,
    NoPrice,
    Admin,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum Outcome {
    None,
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum SettledBy {
    None,
    Oracle,
    Override,
    Backstop,
}

/// The admin's proposed result while Under review (D63, D104).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub struct Proposal {
    pub outcome: Outcome,
    /// The exchange's official close, in cents.
    pub official_close_cents: u64,
    pub proposed_at: i64,
    pub final_at: i64,
    /// Where the official close came from, as text, zero-padded.
    pub source: [u8; 32],
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    /// The stock, as in Config: 1 to 8 capital letters, zero-padded.
    pub ticker: [u8; 8],
    /// The trading day in New York, as yyyymmdd.
    pub day: u32,
    pub strike_cents: u64,
    /// Minting opens (9:00, D46), orders open (9:30), and the stored close; Unix seconds.
    pub mint_open: i64,
    pub open: i64,
    pub close: i64,
    /// D64: pairs outstanding before settlement, unredeemed winning tokens after. The vault holds at least this many
    /// USDC, and no token supply exceeds it.
    pub owed: u64,
    pub status: MarketStatus,
    pub hold: HoldReason,
    pub outcome: Outcome,
    pub settled_by: SettledBy,
    /// The price it settled on, with its band and publish time, in Pyth's units (D105).
    pub price: i64,
    pub conf: u64,
    pub expo: i32,
    pub publish_time: i64,
    pub proposal: Proposal,
    pub book_closed: bool,
    pub created_slot: u64,
    /// Who paid the deposits: the operator or the admin, whichever created it (D24). Close book returns the book's
    /// deposits here (D50), whoever sends it, even after the operator key changes.
    pub creator: Pubkey,
    /// The bumps of the market's own address and of its Yes mint, No mint and vault; the book keeps its own.
    pub bump: u8,
    pub yes_bump: u8,
    pub no_bump: u8,
    pub vault_bump: u8,
    pub _reserved: [u8; 64],
}

impl Market {
    /// The ticker without its padding, as in the market's address.
    pub fn ticker_bytes(&self) -> &[u8] {
        let len = self.ticker.iter().position(|&b| b == 0).unwrap_or(self.ticker.len());
        &self.ticker[..len]
    }

    /// The names wallets show (D108): "META 680+ Yes 10/08".
    pub fn token_name(&self, side: &str) -> String {
        let ticker = core::str::from_utf8(self.ticker_bytes()).unwrap_or("?");
        let (dollars, cents) = (self.strike_cents / 100, self.strike_cents % 100);
        let strike = if cents == 0 { format!("{dollars}") } else { format!("{dollars}.{cents:02}") };
        format!("{ticker} {strike}+ {side} {:02}/{:02}", self.day / 100 % 100, self.day % 100)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct CreateMarketArgs {
    pub ticker: String,
    /// yyyymmdd, New York.
    pub day: u32,
    pub strike_cents: u64,
    pub mint_open: i64,
    pub open: i64,
    pub close: i64,
}

#[event_cpi]
#[derive(Accounts)]
#[instruction(args: CreateMarketArgs)]
pub struct CreateMarket<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    /// The operator or the admin (D24); pays every deposit.
    #[account(
        mut,
        constraint = creator.key() == config.operator || creator.key() == config.admin @ MeridianError::NotOperator
    )]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [MARKET_SEED, args.ticker.as_bytes(), &args.day.to_le_bytes(), &args.strike_cents.to_le_bytes()],
        bump
    )]
    pub market: Box<Account<'info, Market>>,
    /// CHECK: created here as a Token-2022 mint, at its own address.
    #[account(mut, seeds = [YES_SEED, market.key().as_ref()], bump)]
    pub yes_mint: UncheckedAccount<'info>,
    /// CHECK: likewise.
    #[account(mut, seeds = [NO_SEED, market.key().as_ref()], bump)]
    pub no_mint: UncheckedAccount<'info>,
    /// CHECK: created here as a USDC account owned by the market.
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump)]
    pub vault: UncheckedAccount<'info>,
    #[account(init, payer = creator, space = 8 + core::mem::size_of::<Book>(), seeds = [BOOK_SEED, market.key().as_ref()], bump)]
    pub book: AccountLoader<'info, Book>,
    /// CHECK: created here as a USDC account owned by the book.
    #[account(mut, seeds = [BOOK_USDC_SEED, market.key().as_ref()], bump)]
    pub book_usdc: UncheckedAccount<'info>,
    /// CHECK: created here as a Yes account owned by the book.
    #[account(mut, seeds = [BOOK_YES_SEED, market.key().as_ref()], bump)]
    pub book_yes: UncheckedAccount<'info>,
    /// CHECK: Config's USDC mint.
    #[account(address = config.usdc_mint)]
    pub usdc_mint: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: the classic token program, for USDC.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
    /// CHECK: Token-2022, for Yes and No.
    #[account(address = crate::token::TOKEN_2022_PROGRAM_ID)]
    pub token_2022_program: UncheckedAccount<'info>,
}

pub fn handle_create_market(ctx: Context<CreateMarket>, args: CreateMarketArgs) -> Result<()> {
    let config = &ctx.accounts.config;
    let step = config
        .tickers
        .iter()
        .find(|t| t.enabled && t.symbol == args.ticker)
        .map(|t| t.strike_step_cents as u64)
        .ok_or(MeridianError::TickerNotEnabled)?;
    require!(args.strike_cents > 0 && step > 0 && args.strike_cents % step == 0, MeridianError::InvalidStrike);
    let orders_close = args.close - config.thresholds.orders_close_before_secs as i64;
    require!(args.mint_open <= args.open && args.open < orders_close, MeridianError::InvalidTimes);
    require!(Clock::get()?.unix_timestamp < args.open, MeridianError::CreateAfterOpen);

    let bumps = &ctx.bumps;
    let market_key = ctx.accounts.market.key();
    let mut ticker = [0u8; 8];
    ticker[..args.ticker.len()].copy_from_slice(args.ticker.as_bytes());
    {
        let m = &mut ctx.accounts.market;
        m.ticker = ticker;
        m.day = args.day;
        m.strike_cents = args.strike_cents;
        m.mint_open = args.mint_open;
        m.open = args.open;
        m.close = args.close;
        m.owed = 0;
        m.status = MarketStatus::Trading;
        m.hold = HoldReason::None;
        m.outcome = Outcome::None;
        m.settled_by = SettledBy::None;
        m.created_slot = Clock::get()?.slot;
        m.creator = ctx.accounts.creator.key();
        m.bump = bumps.market;
        m.yes_bump = bumps.yes_mint;
        m.no_bump = bumps.no_mint;
        m.vault_bump = bumps.vault;
    }
    ctx.accounts.book.load_init()?.init(market_key, bumps.book, bumps.book_usdc, bumps.book_yes);

    let a = &ctx.accounts;
    let (system, creator, t22, classic) = (
        a.system_program.to_account_info(),
        a.creator.to_account_info(),
        a.token_2022_program.to_account_info(),
        a.token_program.to_account_info(),
    );
    let market_info = a.market.to_account_info();
    let (day, strike, market_bump) = (args.day.to_le_bytes(), args.strike_cents.to_le_bytes(), [bumps.market]);
    let market_seeds: &[&[u8]] = &[MARKET_SEED, args.ticker.as_bytes(), &day, &strike, &market_bump];
    let rent = Rent::get()?;

    // The Yes and No mints: Token-2022, 0 decimals, a name (D108), Permissioned Burn with the market as burn
    // authority (D94), the market as mint authority and as close authority, so Remove market can close them while
    // nothing is minted (D140), and no freeze authority.
    for (mint, seed, bump, side) in
        [(&a.yes_mint, YES_SEED, bumps.yes_mint, "Yes"), (&a.no_mint, NO_SEED, bumps.no_mint, "No")]
    {
        use spl_token_2022_interface::extension::{metadata_pointer, permissioned_burn, ExtensionType};
        let mint = mint.to_account_info();
        let (name, symbol) = (a.market.token_name(side), side.to_uppercase());
        let space = ExtensionType::try_calculate_account_len::<spl_token_2022_interface::state::Mint>(&[
            ExtensionType::PermissionedBurn,
            ExtensionType::MetadataPointer,
            ExtensionType::MintCloseAuthority,
        ])?;
        // The name's extension grows the mint when it is written, so the deposit covers that size from the start:
        // a 4-byte header, the update authority and the mint, then the name, symbol and empty link with their
        // lengths, and an empty list of extra fields.
        let named = space + 4 + 32 + 32 + 4 + name.len() + 4 + symbol.len() + 4 + 4;
        let mint_bump = [bump];
        let mint_seeds: &[&[u8]] = &[seed, market_key.as_ref(), &mint_bump];
        crate::token::create_account(&system, &creator, &mint, rent.minimum_balance(named), space as u64, &t22.key(), &[mint_seeds])?;
        let init = [
            metadata_pointer::instruction::initialize(t22.key, mint.key, Some(market_key), Some(*mint.key))?,
            permissioned_burn::instruction::initialize(t22.key, mint.key, &market_key)?,
            spl_token_2022_interface::instruction::initialize_mint_close_authority(t22.key, mint.key, Some(&market_key))?,
            spl_token_2022_interface::instruction::initialize_mint2(t22.key, mint.key, &market_key, None, 0)?,
        ];
        for ix in init {
            anchor_lang::solana_program::program::invoke(&ix, &[mint.clone(), t22.clone()])?;
        }
        let ix = spl_token_metadata_interface::instruction::initialize(
            t22.key,
            mint.key,
            &market_key,
            mint.key,
            &market_key,
            name,
            symbol,
            String::new(),
        );
        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[mint.clone(), market_info.clone(), t22.clone()],
            &[market_seeds],
        )?;
    }

    // The vault and the book's two token accounts, each at its own address.
    let token_bytes = 165u64;
    let accounts = [
        (a.vault.to_account_info(), VAULT_SEED, bumps.vault, &classic, a.usdc_mint.to_account_info(), market_key),
        (a.book_usdc.to_account_info(), BOOK_USDC_SEED, bumps.book_usdc, &classic, a.usdc_mint.to_account_info(), a.book.key()),
        (a.book_yes.to_account_info(), BOOK_YES_SEED, bumps.book_yes, &t22, a.yes_mint.to_account_info(), a.book.key()),
    ];
    for (account, seed, bump, program, mint, owner) in accounts {
        let bump = [bump];
        let seeds: &[&[u8]] = &[seed, market_key.as_ref(), &bump];
        let lamports = rent.minimum_balance(token_bytes as usize);
        crate::token::create_account(&system, &creator, &account, lamports, token_bytes, &program.key(), &[seeds])?;
        crate::token::initialize_account(program, &account, &mint, &owner)?;
    }

    crate::events::EventWriter::new(ctx.accounts.event_authority.to_account_info()).emit(&crate::events::MarketCreated {
        market: market_key,
        ticker: args.ticker,
        day: args.day,
        strike_cents: args.strike_cents,
        mint_open: args.mint_open,
        open: args.open,
        close: args.close,
        creator: ctx.accounts.creator.key(),
    })
}

/// The vault holds at least 1.00 per pair or winning token owed, and no token's supply exceeds what is owed (D64).
/// At least, not exactly: anyone can send USDC to the vault, and a donation must not stop the market.
pub fn check_vault(market: &Market, vault: &AccountInfo, yes_mint: &AccountInfo, no_mint: &AccountInfo) -> Result<()> {
    let owed = market.owed;
    require!(crate::token::amount(vault)? >= owed.saturating_mul(USDC_PER_PAIR), MeridianError::VaultShort);
    let (yes, no) = (crate::token::supply(yes_mint)?, crate::token::supply(no_mint)?);
    let within = match (market.status, market.outcome) {
        (MarketStatus::Settled, Outcome::Yes) => yes <= owed,
        (MarketStatus::Settled, Outcome::No) => no <= owed,
        _ => yes <= owed && no <= owed,
    };
    require!(within, MeridianError::SupplyOverOwed);
    Ok(())
}

impl Market {
    /// The market's own seeds, to sign as the market.
    pub fn signer_seeds<'a>(&'a self, day: &'a [u8; 4], strike: &'a [u8; 8], bump: &'a [u8; 1]) -> [&'a [u8]; 5] {
        [MARKET_SEED, self.ticker_bytes(), day, strike, bump]
    }
}
