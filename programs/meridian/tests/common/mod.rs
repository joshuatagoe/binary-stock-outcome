//! Mollusk set-up shared by the program's instruction tests: our program and devnet's two token programs (§9), token
//! accounts and mints written by their fixed layouts, Config, and a full order book.
//! Build first (`anchor build`): the tests load target/deploy/meridian.so, and devnet's token programs from
//! tests/fixtures (scripts/program/dump-token-programs.mjs).
#![allow(dead_code)]
use {
    anchor_lang::{
        error::ERROR_CODE_OFFSET, prelude::Pubkey, solana_program::instruction::Instruction, AccountSerialize,
        Discriminator, InstructionData, ToAccountMetas,
    },
    anchor_lang::AccountDeserialize,
    meridian::{
        errors::MeridianError, Book, Config, CreateMarketArgs, Market, OrderKind, PlaceOrderArgs, RedeemMode, Side,
        Thresholds, Ticker, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED, CONFIG_SEED, MARKET_SEED, NO_SEED, SIDE_CAPACITY,
        TRADER_CAPACITY, VAULT_SEED, YES_SEED,
    },
    mollusk_svm::{program::loader_keys::LOADER_V3, result::ProgramResult, Mollusk},
    solana_account::Account,
    spl_token_2022_interface::{
        extension::{
            metadata_pointer::MetadataPointer, permissioned_burn::PermissionedBurnConfig, BaseStateWithExtensionsMut,
            ExtensionType, StateWithExtensionsMut,
        },
        state::Mint,
    },
};

pub const TOKEN: Pubkey = meridian::token::TOKEN_PROGRAM_ID;
pub const TOKEN_2022: Pubkey = meridian::token::TOKEN_2022_PROGRAM_ID;
const TOKEN_SO: &[u8] = include_bytes!("../fixtures/spl_token.so");
const TOKEN_2022_SO: &[u8] = include_bytes!("../fixtures/spl_token_2022.so");

pub fn mollusk() -> Mollusk {
    let mut m = Mollusk::default();
    let program = include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/meridian.so"));
    m.add_program_with_loader_and_elf(&meridian::ID, &LOADER_V3, program);
    m.add_program_with_loader_and_elf(&TOKEN, &LOADER_V3, TOKEN_SO);
    m.add_program_with_loader_and_elf(&TOKEN_2022, &LOADER_V3, TOKEN_2022_SO);
    // Room to measure past the real limit, so the spike's table shows where it is crossed.
    m.compute_budget.compute_unit_limit = 20_000_000;
    // Devnet's and mainnet's rent, 5,080 lamports a byte (M0.12), not the older 6,960 Mollusk starts with.
    m.sysvars.rent.lamports_per_byte = 5_080;
    m
}

pub fn rent(m: &Mollusk, len: usize) -> u64 {
    m.sysvars.rent.minimum_balance(len)
}

pub fn program_account(id: Pubkey) -> (Pubkey, Account) {
    (id, mollusk_svm::program::create_program_account_loader_v3(&id))
}

/// A token account in either program: mint, owner, amount, then an initialized state (165 bytes, §5).
pub fn token_account(m: &Mollusk, program: Pubkey, mint: Pubkey, owner: Pubkey, amount: u64) -> Account {
    let mut data = vec![0u8; 165];
    data[0..32].copy_from_slice(mint.as_ref());
    data[32..64].copy_from_slice(owner.as_ref());
    data[64..72].copy_from_slice(&amount.to_le_bytes());
    data[108] = 1;
    Account { lamports: rent(m, 165), data, owner: program, executable: false, rent_epoch: 0 }
}

pub fn token_amount(account: &Account) -> u64 {
    u64::from_le_bytes(account.data[64..72].try_into().unwrap())
}

/// A mint's first 82 bytes: its authority, supply, decimals and "initialized" (§5).
fn mint_base(data: &mut [u8], authority: Pubkey, supply: u64, decimals: u8) {
    data[0] = 1;
    data[4..36].copy_from_slice(authority.as_ref());
    data[36..44].copy_from_slice(&supply.to_le_bytes());
    data[44] = decimals;
    data[45] = 1;
}

/// USDC on the classic token program.
pub fn usdc_mint(m: &Mollusk, supply: u64) -> Account {
    let mut data = vec![0u8; 82];
    mint_base(&mut data, Pubkey::new_unique(), supply, 6);
    Account { lamports: rent(m, 82), data, owner: TOKEN, executable: false, rent_epoch: 0 }
}

/// A market's Yes mint on Token-2022, with Permissioned Burn (D94) and a metadata pointer, as M0.12 made them.
pub fn yes_mint(m: &Mollusk, authority: Pubkey, supply: u64) -> Account {
    let extensions = [ExtensionType::PermissionedBurn, ExtensionType::MetadataPointer];
    let len = ExtensionType::try_calculate_account_len::<Mint>(&extensions).unwrap();
    let mut data = vec![0u8; len];
    {
        let mut state = StateWithExtensionsMut::<Mint>::unpack_uninitialized(&mut data).unwrap();
        state.init_extension::<PermissionedBurnConfig>(true).unwrap();
        state.init_extension::<MetadataPointer>(true).unwrap();
        state.init_account_type().unwrap();
    }
    mint_base(&mut data, authority, supply, 0);
    Account { lamports: rent(m, len), data, owner: TOKEN_2022, executable: false, rent_epoch: 0 }
}

pub fn config(m: &Mollusk, usdc_mint: Pubkey, fill_limit: u16, paused: bool) -> Account {
    config_for(m, usdc_mint, Pubkey::new_unique(), Pubkey::new_unique(), fill_limit, paused)
}

/// Config with the seven stocks, a $10 strike step, and XOM listed but turned off.
pub fn config_for(m: &Mollusk, usdc_mint: Pubkey, operator: Pubkey, admin: Pubkey, fill_limit: u16, paused: bool) -> Account {
    let ticker = |symbol: &str, b: u8| Ticker { symbol: symbol.into(), feed_id: [b; 32], strike_step_cents: 1000, enabled: symbol != "XOM" };
    let stocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "XOM"];
    let config = Config {
        admin,
        pending_admin: None,
        operator,
        usdc_mint,
        pyth_receivers: vec![Pubkey::new_unique(), Pubkey::new_unique()],
        tickers: stocks.iter().enumerate().map(|(i, s)| ticker(s, i as u8)).collect(),
        ladder_bps: [300, 600, 900],
        paused,
        thresholds: Thresholds {
            orders_close_before_secs: 5,
            publish_window_secs: 5,
            max_band_bps: 25,
            override_bound_bps: 50,
            override_wait_secs: 3_600,
            override_wait_long_secs: 86_400,
            operator_only_settle_secs: 86_400,
            admin_hold_backstop_secs: 86_400,
            band_hold_backstop_secs: 604_800,
            no_price_hold_after_secs: 900,
        },
        fill_limit,
        bump: Pubkey::find_program_address(&[CONFIG_SEED], &meridian::ID).1,
    };
    let mut data = Vec::new();
    config.try_serialize(&mut data).unwrap();
    // Full size, as Initialize Config allocates it, so a field that grows (a pending admin) still fits.
    data.resize(8 + <Config as anchor_lang::Space>::INIT_SPACE, 0);
    Account { lamports: rent(m, data.len()), data, owner: meridian::ID, executable: false, rent_epoch: 0 }
}

/// A taker's order, and the book it meets.
pub struct Order {
    pub side: Side,
    pub kind: OrderKind,
    pub price: u8,
    pub quantity: u32,
    pub fill_limit: u16,
    pub paused: bool,
    /// How many makers rest an offer (36¢ upward) and a bid (35¢ downward), 1 Yes each; 64 fills the book.
    pub makers: usize,
    /// An order the taker already rests, placed before the makers'.
    pub taker_rests: Option<PlaceOrderArgs>,
    /// The taker's address, when a test needs its key to sign.
    pub taker: Option<Pubkey>,
}

impl Order {
    /// A Market order that reaches `fills` resting orders on the full book, or none at 0.
    pub fn reaching(side: Side, fills: u32) -> Order {
        // No fills: one Yes at a worst price just short of the best resting order (35¢ against 36¢ offers, 36¢
        // against 35¢ bids).
        let price = match (side, fills) {
            (Side::Buy, 0) => 35,
            (Side::Sell, 0) => 36,
            (Side::Buy, _) => 99,
            (Side::Sell, _) => 1,
        };
        Order {
            side,
            kind: OrderKind::Market,
            price,
            quantity: fills.max(1),
            fill_limit: 64,
            paused: false,
            makers: TRADER_CAPACITY,
            taker_rests: None,
            taker: None,
        }
    }
}

pub struct OrderSetup {
    pub m: Mollusk,
    pub ix: Instruction,
    pub accounts: Vec<(Pubkey, Account)>,
    pub book: Pubkey,
    pub book_usdc: Pubkey,
    pub book_yes: Pubkey,
    pub taker_usdc: Pubkey,
    pub taker_yes: Pubkey,
}

impl OrderSetup {
    pub fn account_mut(&mut self, key: Pubkey) -> &mut Account {
        &mut self.accounts.iter_mut().find(|(k, _)| *k == key).unwrap().1
    }
}

/// A book of `o.makers` traders, each resting an offer and a bid of 1 Yes (all 64: offers at 36¢ to 99¢ and bids at
/// 1¢ to 35¢, a full book), and a taker with 1,000 USDC and, for a sell, the Yes it sells.
pub fn full_book(o: Order) -> OrderSetup {
    let mut m = mollusk();
    m.sysvars.clock.unix_timestamp = AT_10_16;
    let (market, market_bump) = market_pda(&meta_680());
    let pda = |seed: &[u8]| Pubkey::find_program_address(&[seed, market.as_ref()], &meridian::ID);
    let ((book, bump), (book_usdc, usdc_bump), (book_yes, yes_bump)) = (pda(BOOK_SEED), pda(BOOK_USDC_SEED), pda(BOOK_YES_SEED));
    let mut b: Box<Book> = Box::new(bytemuck::Zeroable::zeroed());
    b.init(market, bump, usdc_bump, yes_bump, pda(meridian::BOOK_NO_SEED).1);
    let taker = o.taker.unwrap_or_else(Pubkey::new_unique);
    if let Some(rest) = &o.taker_rests {
        b.place(&taker, rest, 64).unwrap();
    }
    for i in 0..o.makers {
        let maker = Pubkey::new_unique();
        let rest = |side, price, id| PlaceOrderArgs { side, kind: OrderKind::Limit, price, quantity: 1, order_id: id };
        b.place(&maker, &rest(Side::Sell, 36 + i as u8, 1), 64).unwrap();
        b.place(&maker, &rest(Side::Buy, 1 + (i % 35) as u8, 2), 64).unwrap();
    }
    if o.makers == TRADER_CAPACITY {
        assert_eq!((b.ask_count as usize, b.bid_count as usize), (SIDE_CAPACITY, SIDE_CAPACITY));
    }
    let mut book_data = Book::DISCRIMINATOR.to_vec();
    book_data.extend_from_slice(bytemuck::bytes_of(&*b));

    let (usdc_mint_key, (yes_mint_key, yes_bump)) = (Pubkey::new_unique(), pda(YES_SEED));
    let (taker_usdc, taker_yes) = (Pubkey::new_unique(), Pubkey::new_unique());
    let config_key = Pubkey::find_program_address(&[CONFIG_SEED], &meridian::ID).0;
    let event_authority = Pubkey::find_program_address(&[b"__event_authority"], &meridian::ID).0;
    let taker_yes_amount = if o.side == Side::Sell { o.quantity as u64 } else { 0 };
    let accounts = vec![
        (config_key, config(&m, usdc_mint_key, o.fill_limit, o.paused)),
        (market, market_account(&m, market_bump, yes_bump)),
        (book, Account { lamports: rent(&m, book_data.len()), data: book_data, owner: meridian::ID, executable: false, rent_epoch: 0 }),
        (book_usdc, token_account(&m, TOKEN, usdc_mint_key, book, b.locked_usdc() + b.free_usdc())),
        (book_yes, token_account(&m, TOKEN_2022, yes_mint_key, book, b.locked_yes() + b.free_yes())),
        (taker, Account { lamports: 10_000_000_000, ..Account::default() }),
        (taker_usdc, token_account(&m, TOKEN, usdc_mint_key, taker, 1_000_000_000)),
        (taker_yes, token_account(&m, TOKEN_2022, yes_mint_key, taker, taker_yes_amount)),
        (usdc_mint_key, usdc_mint(&m, 10_000_000_000)),
        (yes_mint_key, yes_mint(&m, market, 1_000)),
        program_account(TOKEN),
        program_account(TOKEN_2022),
        (event_authority, Account::default()),
        program_account(meridian::ID),
    ];
    let args = PlaceOrderArgs { side: o.side, kind: o.kind, price: o.price, quantity: o.quantity, order_id: 1 };
    let metas = meridian::accounts::PlaceOrder {
        config: config_key,
        market,
        book,
        book_usdc,
        book_yes,
        taker,
        taker_usdc,
        taker_yes,
        usdc_mint: usdc_mint_key,
        yes_mint: yes_mint_key,
        token_program: TOKEN,
        token_2022_program: TOKEN_2022,
        event_authority,
        program: meridian::ID,
    }
    .to_account_metas(None);
    let ix = Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::PlaceOrder { args }.data() };
    OrderSetup { m, ix, accounts, book, book_usdc, book_yes, taker_usdc, taker_yes }
}

/// The program refused with this error.
pub fn refused_with(result: &ProgramResult, error: MeridianError) -> bool {
    let code = error as u32 + ERROR_CODE_OFFSET;
    matches!(result, ProgramResult::Failure(e) if format!("{e:?}") == format!("Custom({code})"))
}

// The running example's day, Thursday 2026-10-08, New York time (EDT, UTC-4), in Unix seconds.
pub const AT_8_30: i64 = 1_791_462_600;
pub const AT_9_00: i64 = 1_791_464_400;
pub const AT_9_30: i64 = 1_791_466_200;
pub const AT_4_00_PM: i64 = 1_791_489_600;

/// The META $680 market of 2026-10-08.
pub fn meta_680() -> CreateMarketArgs {
    CreateMarketArgs { ticker: "META".into(), day: 20_261_008, strike_cents: 68_000, mint_open: AT_9_00, open: AT_9_30, close: AT_4_00_PM }
}

pub fn market_pda(args: &CreateMarketArgs) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[MARKET_SEED, args.ticker.as_bytes(), &args.day.to_le_bytes(), &args.strike_cents.to_le_bytes()],
        &meridian::ID,
    )
}

pub fn pda(seed: &[u8], market: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[seed, market.as_ref()], &meridian::ID).0
}

pub struct Trader {
    pub owner: Pubkey,
    pub usdc: Pubkey,
    pub yes: Pubkey,
    pub no: Pubkey,
}

/// A chain of instructions on one set of accounts: each step starts from the accounts the last one left.
pub struct Chain {
    pub m: Mollusk,
    pub accounts: Vec<(Pubkey, Account)>,
    pub operator: Pubkey,
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub config: Pubkey,
    pub event_authority: Pubkey,
}

impl Chain {
    /// Config (paused if asked), the USDC mint, the programs, and an operator and an admin with SOL, at 8:30.
    pub fn new(paused: bool) -> Chain {
        let mut m = mollusk();
        m.sysvars.clock.unix_timestamp = AT_8_30;
        let (operator, admin, usdc) = (Pubkey::new_unique(), Pubkey::new_unique(), Pubkey::new_unique());
        let config = Pubkey::find_program_address(&[CONFIG_SEED], &meridian::ID).0;
        let event_authority = Pubkey::find_program_address(&[b"__event_authority"], &meridian::ID).0;
        let accounts = vec![
            (config, config_for(&m, usdc, operator, admin, 32, paused)),
            (usdc, usdc_mint(&m, 1_000_000_000_000)),
            (operator, Account { lamports: 10_000_000_000, ..Account::default() }),
            (admin, Account { lamports: 10_000_000_000, ..Account::default() }),
            (event_authority, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
            program_account(TOKEN),
            program_account(TOKEN_2022),
            program_account(meridian::ID),
        ];
        Chain { m, accounts, operator, admin, usdc_mint: usdc, config, event_authority }
    }

    pub fn at(&mut self, unix_timestamp: i64) -> &mut Self {
        self.m.sysvars.clock.unix_timestamp = unix_timestamp;
        self
    }

    pub fn account(&self, key: &Pubkey) -> Option<&Account> {
        self.accounts.iter().find(|(k, _)| k == key).map(|(_, a)| a)
    }

    pub fn set(&mut self, key: Pubkey, account: Account) {
        match self.accounts.iter_mut().find(|(k, _)| *k == key) {
            Some(entry) => entry.1 = account,
            None => self.accounts.push((key, account)),
        }
    }

    /// Runs the instruction on the current accounts; on success, keeps the accounts it changed.
    pub fn run(&mut self, ix: &Instruction) -> mollusk_svm::result::InstructionResult {
        for meta in &ix.accounts {
            if self.account(&meta.pubkey).is_none() {
                self.accounts.push((meta.pubkey, Account::default()));
            }
        }
        let r = self.m.process_instruction(ix, &self.accounts);
        if r.program_result.is_ok() {
            for (key, account) in &r.resulting_accounts {
                self.set(*key, account.clone());
            }
        }
        r
    }

    pub fn create_market_ix(&self, creator: Pubkey, args: &CreateMarketArgs) -> Instruction {
        let market = market_pda(args).0;
        let metas = meridian::accounts::CreateMarket {
            config: self.config,
            creator,
            market,
            yes_mint: pda(YES_SEED, &market),
            no_mint: pda(NO_SEED, &market),
            vault: pda(VAULT_SEED, &market),
            book: pda(BOOK_SEED, &market),
            book_usdc: pda(BOOK_USDC_SEED, &market),
            book_yes: pda(BOOK_YES_SEED, &market),
            book_no: pda(meridian::BOOK_NO_SEED, &market),
            usdc_mint: self.usdc_mint,
            system_program: anchor_lang::system_program::ID,
            token_program: TOKEN,
            token_2022_program: TOKEN_2022,
            event_authority: self.event_authority,
            program: meridian::ID,
        }
        .to_account_metas(None);
        Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::CreateMarket { args: args.clone() }.data() }
    }

    /// Creates META $680 as the operator, at the chain's time, and returns its address.
    pub fn create_meta_680(&mut self) -> Pubkey {
        let ix = self.create_market_ix(self.operator, &meta_680());
        let r = self.run(&ix);
        assert!(r.program_result.is_ok(), "create: {:?}", r.program_result);
        market_pda(&meta_680()).0
    }

    /// A trader with SOL, the given USDC, and empty Yes and No accounts on the market's mints.
    pub fn trader(&mut self, market: &Pubkey, usdc: u64) -> Trader {
        let (owner, usdc_key, yes, no) = (Pubkey::new_unique(), Pubkey::new_unique(), Pubkey::new_unique(), Pubkey::new_unique());
        let usdc_account = token_account(&self.m, TOKEN, self.usdc_mint, owner, usdc);
        let yes_account = token_account(&self.m, TOKEN_2022, pda(YES_SEED, market), owner, 0);
        let no_account = token_account(&self.m, TOKEN_2022, pda(NO_SEED, market), owner, 0);
        self.set(owner, Account { lamports: 1_000_000_000, ..Account::default() });
        self.set(usdc_key, usdc_account);
        self.set(yes, yes_account);
        self.set(no, no_account);
        Trader { owner, usdc: usdc_key, yes, no }
    }

    pub fn mint_pairs_ix(&self, market: &Pubkey, t: &Trader, quantity: u64) -> Instruction {
        let metas = meridian::accounts::MintPairs {
            config: self.config,
            market: *market,
            minter: t.owner,
            minter_usdc: t.usdc,
            minter_yes: t.yes,
            minter_no: t.no,
            vault: pda(VAULT_SEED, market),
            yes_mint: pda(YES_SEED, market),
            no_mint: pda(NO_SEED, market),
            usdc_mint: self.usdc_mint,
            token_program: TOKEN,
            token_2022_program: TOKEN_2022,
            event_authority: self.event_authority,
            program: meridian::ID,
        }
        .to_account_metas(None);
        Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::MintPairs { quantity }.data() }
    }

    pub fn redeem_ix(&self, market: &Pubkey, t: &Trader, mode: RedeemMode, quantity: u64) -> Instruction {
        let metas = meridian::accounts::Redeem {
            config: self.config,
            market: *market,
            holder: t.owner,
            holder_usdc: t.usdc,
            holder_yes: t.yes,
            holder_no: t.no,
            vault: pda(VAULT_SEED, market),
            yes_mint: pda(YES_SEED, market),
            no_mint: pda(NO_SEED, market),
            usdc_mint: self.usdc_mint,
            token_program: TOKEN,
            token_2022_program: TOKEN_2022,
            event_authority: self.event_authority,
            program: meridian::ID,
        }
        .to_account_metas(None);
        Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::Redeem { mode, quantity }.data() }
    }

    pub fn place_order_ix(&self, market: &Pubkey, t: &Trader, args: PlaceOrderArgs) -> Instruction {
        let metas = meridian::accounts::PlaceOrder {
            config: self.config,
            market: *market,
            book: pda(BOOK_SEED, market),
            book_usdc: pda(BOOK_USDC_SEED, market),
            book_yes: pda(BOOK_YES_SEED, market),
            taker: t.owner,
            taker_usdc: t.usdc,
            taker_yes: t.yes,
            usdc_mint: self.usdc_mint,
            yes_mint: pda(YES_SEED, market),
            token_program: TOKEN,
            token_2022_program: TOKEN_2022,
            event_authority: self.event_authority,
            program: meridian::ID,
        }
        .to_account_metas(None);
        Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::PlaceOrder { args }.data() }
    }

    /// Buy No and Sell No's accounts (§6, instructions 11 and 12), with the trader's own three token accounts.
    pub fn no_trade_metas(&self, market: &Pubkey, t: &Trader) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        meridian::accounts::NoTrade {
            config: self.config,
            market: *market,
            book: pda(BOOK_SEED, market),
            book_usdc: pda(BOOK_USDC_SEED, market),
            book_yes: pda(BOOK_YES_SEED, market),
            book_no: pda(meridian::BOOK_NO_SEED, market),
            vault: pda(VAULT_SEED, market),
            yes_mint: pda(YES_SEED, market),
            no_mint: pda(NO_SEED, market),
            taker: t.owner,
            taker_usdc: t.usdc,
            taker_yes: t.yes,
            taker_no: t.no,
            usdc_mint: self.usdc_mint,
            token_program: TOKEN,
            token_2022_program: TOKEN_2022,
            event_authority: self.event_authority,
            program: meridian::ID,
        }
        .to_account_metas(None)
    }

    pub fn buy_no_ix(&self, market: &Pubkey, t: &Trader, args: meridian::BuyNoArgs) -> Instruction {
        let data = meridian::instruction::BuyNo { args }.data();
        Instruction { program_id: meridian::ID, accounts: self.no_trade_metas(market, t), data }
    }

    pub fn sell_no_ix(&self, market: &Pubkey, t: &Trader, args: meridian::SellNoArgs) -> Instruction {
        let data = meridian::instruction::SellNo { args }.data();
        Instruction { program_id: meridian::ID, accounts: self.no_trade_metas(market, t), data }
    }

    pub fn cancel_order_ix(&self, market: &Pubkey, owner: Pubkey, order_id: u64) -> Instruction {
        let metas = meridian::accounts::CancelOrder {
            config: self.config,
            market: *market,
            book: pda(BOOK_SEED, market),
            owner,
            book_usdc: pda(BOOK_USDC_SEED, market),
            book_yes: pda(BOOK_YES_SEED, market),
            book_no: pda(meridian::BOOK_NO_SEED, market),
            vault: pda(VAULT_SEED, market),
            yes_mint: pda(YES_SEED, market),
            no_mint: pda(NO_SEED, market),
            usdc_mint: self.usdc_mint,
            token_program: TOKEN,
            token_2022_program: TOKEN_2022,
            event_authority: self.event_authority,
            program: meridian::ID,
        }
        .to_account_metas(None);
        Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::CancelOrder { order_id }.data() }
    }

    /// Return to owner (§6, instruction 16) for `owner`'s balance, paid to the three accounts named in `owner`. No
    /// account signs: anyone may send it, and the transaction's fee payer is not one of its accounts.
    pub fn return_to_owner_ix(&self, market: &Pubkey, owner: &Trader) -> Instruction {
        let metas = meridian::accounts::ReturnToOwner {
            config: self.config,
            market: *market,
            book: pda(BOOK_SEED, market),
            book_usdc: pda(BOOK_USDC_SEED, market),
            book_yes: pda(BOOK_YES_SEED, market),
            book_no: pda(meridian::BOOK_NO_SEED, market),
            owner: owner.owner,
            owner_usdc: owner.usdc,
            owner_yes: owner.yes,
            owner_no: owner.no,
            no_mint: pda(NO_SEED, market),
            yes_mint: pda(YES_SEED, market),
            usdc_mint: self.usdc_mint,
            token_program: TOKEN,
            token_2022_program: TOKEN_2022,
            event_authority: self.event_authority,
            program: meridian::ID,
        }
        .to_account_metas(None);
        Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::ReturnToOwner {}.data() }
    }

    /// The close sweep (§6, instruction 15), signed by `operator`.
    pub fn sweep_ix(&self, market: &Pubkey, operator: Pubkey) -> Instruction {
        let metas = meridian::accounts::Sweep {
            config: self.config,
            operator,
            market: *market,
            book: pda(BOOK_SEED, market),
            book_usdc: pda(BOOK_USDC_SEED, market),
            book_yes: pda(BOOK_YES_SEED, market),
            book_no: pda(meridian::BOOK_NO_SEED, market),
            vault: pda(VAULT_SEED, market),
            yes_mint: pda(YES_SEED, market),
            no_mint: pda(NO_SEED, market),
            usdc_mint: self.usdc_mint,
            token_program: TOKEN,
            token_2022_program: TOKEN_2022,
            event_authority: self.event_authority,
            program: meridian::ID,
        }
        .to_account_metas(None);
        Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::Sweep {}.data() }
    }

    /// Replace quotes (§6, instruction 14) from `maker`, paying from and to `maker_usdc`. Each book is (market, the
    /// maker's own Yes account on that market, the new quotes); its six accounts follow in the remaining accounts as
    /// BookQuotes says: the market, its book, the book's USDC and Yes accounts, the Yes mint, the maker's Yes account.
    pub fn replace_quotes_ix(&self, maker: Pubkey, maker_usdc: Pubkey, books: &[(Pubkey, Pubkey, Vec<meridian::Quote>)]) -> Instruction {
        use anchor_lang::solana_program::instruction::AccountMeta;
        let mut metas = meridian::accounts::ReplaceQuotes {
            config: self.config,
            maker,
            maker_usdc,
            usdc_mint: self.usdc_mint,
            token_program: TOKEN,
            token_2022_program: TOKEN_2022,
            event_authority: self.event_authority,
            program: meridian::ID,
        }
        .to_account_metas(None);
        for (market, maker_yes, _) in books {
            metas.extend([
                AccountMeta::new_readonly(*market, false),
                AccountMeta::new(pda(BOOK_SEED, market), false),
                AccountMeta::new(pda(BOOK_USDC_SEED, market), false),
                AccountMeta::new(pda(BOOK_YES_SEED, market), false),
                AccountMeta::new_readonly(pda(YES_SEED, market), false),
                AccountMeta::new(*maker_yes, false),
            ]);
        }
        let books = books.iter().map(|(_, _, quotes)| meridian::BookQuotes { quotes: quotes.clone() }).collect();
        Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::ReplaceQuotes { books }.data() }
    }

    /// Rewrites Config with this fill limit and pause flag, keeping the chain's operator, admin and USDC mint.
    pub fn set_config(&mut self, fill_limit: u16, paused: bool) {
        let config = config_for(&self.m, self.usdc_mint, self.operator, self.admin, fill_limit, paused);
        self.set(self.config, config);
    }

    /// A copy of the market's book.
    pub fn book(&self, market: &Pubkey) -> Box<Book> {
        Box::new(bytemuck::pod_read_unaligned(&self.account(&pda(BOOK_SEED, market)).unwrap().data[8..]))
    }

    pub fn amount(&self, key: &Pubkey) -> u64 {
        token_amount(self.account(key).unwrap())
    }

    pub fn supply(&self, mint: &Pubkey) -> u64 {
        u64::from_le_bytes(self.account(mint).unwrap().data[36..44].try_into().unwrap())
    }

    pub fn market(&self, key: &Pubkey) -> Market {
        let data = &self.account(key).unwrap().data;
        Market::try_deserialize(&mut &data[..]).unwrap()
    }

    /// Writes a market's state, as a later step such as settlement (M3) would.
    pub fn set_market(&mut self, key: &Pubkey, market: &Market) {
        let mut account = self.account(key).unwrap().clone();
        let mut data = Vec::new();
        market.try_serialize(&mut data).unwrap();
        account.data[..data.len()].copy_from_slice(&data);
        self.set(*key, account);
    }

    pub fn set_amount(&mut self, key: &Pubkey, amount: u64) {
        let mut account = self.account(key).unwrap().clone();
        account.data[64..72].copy_from_slice(&amount.to_le_bytes());
        self.set(*key, account);
    }

    /// The market's status, as a later step such as a hold or settlement (M3) would write it.
    pub fn set_status(&mut self, market: &Pubkey, status: meridian::MarketStatus) {
        let mut m = self.market(market);
        m.status = status;
        self.set_market(market, &m);
    }

    /// The owner's balance in the book: USDC, Yes and No, or zeros without an entry.
    pub fn free(&self, market: &Pubkey, owner: &Pubkey) -> (u64, u64, u64) {
        self.book(market).trader(owner).map(|t| (t.free_usdc, t.free_yes, t.free_no)).unwrap_or_default()
    }
}

/// Anchor's own account checks refused with this error, such as ConstraintSeeds for an account at the wrong address.
pub fn refused_by_anchor(result: &ProgramResult, error: anchor_lang::error::ErrorCode) -> bool {
    let code = error as u32;
    matches!(result, ProgramResult::Failure(e) if format!("{e:?}") == format!("Custom({code})"))
}

/// 10:16, when Alice buys Dave's offer (§3).
pub const AT_10_16: i64 = AT_9_30 + 46 * 60;

/// META $680 as Create market leaves it, for tests that start from a book.
pub fn market_account(m: &Mollusk, bump: u8, yes_bump: u8) -> Account {
    let args = meta_680();
    let mut ticker = [0u8; 8];
    ticker[..args.ticker.len()].copy_from_slice(args.ticker.as_bytes());
    let market = Market {
        ticker,
        day: args.day,
        strike_cents: args.strike_cents,
        mint_open: args.mint_open,
        open: args.open,
        close: args.close,
        owed: 0,
        status: meridian::MarketStatus::Trading,
        hold: meridian::HoldReason::None,
        outcome: meridian::Outcome::None,
        settled_by: meridian::SettledBy::None,
        price: 0,
        conf: 0,
        expo: 0,
        publish_time: 0,
        proposal: meridian::Proposal {
            outcome: meridian::Outcome::None,
            official_close_cents: 0,
            proposed_at: 0,
            final_at: 0,
            source: [0; 32],
        },
        book_closed: false,
        created_slot: 0,
        creator: Pubkey::new_unique(),
        bump,
        yes_bump,
        no_bump: Pubkey::find_program_address(&[NO_SEED, market_pda(&meta_680()).0.as_ref()], &meridian::ID).1,
        vault_bump: Pubkey::find_program_address(&[VAULT_SEED, market_pda(&meta_680()).0.as_ref()], &meridian::ID).1,
        feed_id: [5; 32],
        _reserved: [0; 32],
    };
    let mut data = Vec::new();
    market.try_serialize(&mut data).unwrap();
    Account { lamports: rent(m, data.len()), data, owner: meridian::ID, executable: false, rent_epoch: 0 }
}

// The recorded close and settlement (M3-a): Pyth's two receivers (D80), the stocks' real feeds, and real Pyth price
// accounts saved from devnet in tests/fixtures (pyth-prices.json says where each came from).

pub const LEGACY_RECEIVER: Pubkey = anchor_lang::prelude::pubkey!("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");
pub const UPGRADED_RECEIVER: Pubkey = anchor_lang::prelude::pubkey!("rec2HHDDnjLfj4kE7VyEtFA1HPGQLK33259532cRyHp");
/// Pyth's regular-session feeds (F4.06; config/program-devnet.json), and GOOG, which is not GOOGL (D55).
pub const FEEDS: [(&str, &str); 7] = [
    ("AAPL", "49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688"),
    ("MSFT", "d0ca23c1cc005e004ccf1db5bf76aeb6a49218f43dac3d4b275e92de12ded4d1"),
    ("GOOGL", "5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6"),
    ("AMZN", "b5d0e0fa58a1f8b81498ae670ce93c872d14434b72c364885d4fa1b257cbb07a"),
    ("NVDA", "b1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593"),
    ("META", "78a3e3b8e676a8f73c439f5d749737034b139bbbe899ba5775216fba596607fe"),
    ("TSLA", "16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1"),
];
pub const GOOG_FEED: &str = "e65ff435be42630439c96396653a342829e877e2aafaeaf1a10d0ee5fd2cf3f2";

pub fn feed(hex: &str) -> [u8; 32] {
    let mut out = [0u8; 32];
    for (i, byte) in out.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&hex[2 * i..2 * i + 2], 16).unwrap();
    }
    out
}

pub fn feed_of(ticker: &str) -> [u8; 32] {
    feed(FEEDS.iter().find(|(t, _)| *t == ticker).unwrap().1)
}

const PYTH_PRICES: &str = include_str!("../fixtures/pyth-prices.json");

/// A Pyth price account saved from devnet, at its own address, with its owner and lamports, exactly as read.
pub fn pyth(name: &str) -> (Pubkey, Account) {
    use std::str::FromStr;
    let data: &[u8] = match name {
        "meta_push_legacy" => include_bytes!("../fixtures/pyth_meta_push_legacy.bin"),
        "aapl_push_legacy" => include_bytes!("../fixtures/pyth_aapl_push_legacy.bin"),
        "meta_close_20261008_upgraded" => include_bytes!("../fixtures/pyth_meta_close_20261008_upgraded.bin"),
        "meta_partial_legacy" => include_bytes!("../fixtures/pyth_meta_partial_legacy.bin"),
        _ => panic!("no fixture {name}"),
    };
    let meta: serde_json::Value = serde_json::from_str(PYTH_PRICES).unwrap();
    let meta = &meta[name];
    assert_eq!(meta["bytes"].as_u64().unwrap() as usize, data.len(), "{name}: the saved size");
    let address = Pubkey::from_str(meta["address"].as_str().unwrap()).unwrap();
    let owner = Pubkey::from_str(meta["owner"].as_str().unwrap()).unwrap();
    let lamports = meta["lamports"].as_u64().unwrap();
    (address, Account { lamports, data: data.to_vec(), owner, executable: false, rent_epoch: 0 })
}

/// A price account's contents, read with Pyth's own layout (pyth-solana-receiver-sdk 2.0.0).
pub fn price_update(account: &Account) -> pyth_solana_receiver_sdk::price_update::PriceUpdateV2 {
    anchor_lang::AccountDeserialize::try_deserialize(&mut &account.data[..]).unwrap()
}

/// The same account holding `update` instead: a crafted variant of a real one, for a negative or boundary case.
pub fn with_update(account: &Account, update: &pyth_solana_receiver_sdk::price_update::PriceUpdateV2) -> Account {
    let mut data = Vec::new();
    update.try_serialize(&mut data).unwrap();
    assert!(data.len() <= account.data.len());
    data.resize(account.data.len(), 0);
    Account { data, ..account.clone() }
}

/// A real price account with its price message changed by `change`, at a new address.
pub fn crafted(
    name: &str,
    change: impl FnOnce(&mut pyth_solana_receiver_sdk::price_update::PriceFeedMessage),
) -> (Pubkey, Account) {
    let (_, account) = pyth(name);
    let mut update = price_update(&account);
    change(&mut update.price_message);
    (Pubkey::new_unique(), with_update(&account, &update))
}

pub fn close_pda(ticker: &str, day: u32) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[meridian::CLOSE_SEED, ticker.as_bytes(), &day.to_le_bytes()], &meridian::ID)
}

impl Chain {
    pub fn config_state(&self) -> Config {
        Config::try_deserialize(&mut &self.account(&self.config).unwrap().data[..]).unwrap()
    }

    pub fn set_config_state(&mut self, config: &Config) {
        let mut account = self.account(&self.config).unwrap().clone();
        let mut data = Vec::new();
        config.try_serialize(&mut data).unwrap();
        account.data.fill(0);
        account.data[..data.len()].copy_from_slice(&data);
        self.set(self.config, account);
    }

    /// Config as on devnet for prices: these receivers, and the seven stocks' real feeds with META's strike step in
    /// cents as given (1 lets a test put a strike at any cent).
    pub fn use_pyth(&mut self, receivers: Vec<Pubkey>, meta_step_cents: u32) {
        let mut config = self.config_state();
        config.pyth_receivers = receivers;
        for t in config.tickers.iter_mut() {
            if let Some((_, hex)) = FEEDS.iter().find(|(s, _)| *s == t.symbol) {
                t.feed_id = feed(hex);
            }
            if t.symbol == "META" {
                t.strike_step_cents = meta_step_cents;
            }
        }
        self.set_config_state(&config);
    }

    /// Creates a market as the operator, at a chain time before its open, and returns its address.
    pub fn create(&mut self, args: &CreateMarketArgs) -> Pubkey {
        let now = self.m.sysvars.clock.unix_timestamp;
        self.at(args.mint_open - 1800);
        let ix = self.create_market_ix(self.operator, args);
        let r = self.run(&ix);
        assert!(r.program_result.is_ok(), "create {} {}: {:?}", args.ticker, args.strike_cents, r.program_result);
        self.at(now);
        market_pda(args).0
    }

    pub fn record_close_ix(&self, market: &Pubkey, price_account: Pubkey, recorder: Pubkey) -> Instruction {
        let m = self.market(market);
        let ticker = core::str::from_utf8(m.ticker_bytes()).unwrap();
        let metas = meridian::accounts::RecordClose {
            config: self.config,
            market: *market,
            recorded_close: close_pda(ticker, m.day).0,
            price_account,
            recorder,
            system_program: anchor_lang::system_program::ID,
            event_authority: self.event_authority,
            program: meridian::ID,
        }
        .to_account_metas(None);
        Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::RecordClose {}.data() }
    }

    pub fn settle_ix(&self, market: &Pubkey, settler: Pubkey) -> Instruction {
        let m = self.market(market);
        let ticker = core::str::from_utf8(m.ticker_bytes()).unwrap();
        let metas = meridian::accounts::Settle {
            config: self.config,
            market: *market,
            recorded_close: close_pda(ticker, m.day).0,
            settler,
            event_authority: self.event_authority,
            program: meridian::ID,
        }
        .to_account_metas(None);
        Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::Settle {}.data() }
    }

    /// The stock's recorded close for that day, if there is one.
    pub fn recorded_close(&self, ticker: &str, day: u32) -> Option<meridian::RecordedClose> {
        let account = self.account(&close_pda(ticker, day).0)?;
        if account.owner != meridian::ID || account.data.is_empty() {
            return None;
        }
        Some(meridian::RecordedClose::try_deserialize(&mut &account.data[..]).unwrap())
    }

    /// The vault's rule after any instruction (D64): it holds at least 1.00 per pair or winning token owed, and no
    /// token's supply is above what is owed; once settled, only the winning side's.
    pub fn assert_vault(&self, market: &Pubkey) {
        let m = self.market(market);
        let vault = self.amount(&pda(VAULT_SEED, market));
        let (yes, no) = (self.supply(&pda(YES_SEED, market)), self.supply(&pda(NO_SEED, market)));
        assert!(vault >= m.owed * meridian::USDC_PER_PAIR, "vault {vault} below owed {}", m.owed);
        match (m.status, m.outcome) {
            (meridian::MarketStatus::Settled, meridian::Outcome::Yes) => assert!(yes <= m.owed, "Yes {yes} above owed {}", m.owed),
            (meridian::MarketStatus::Settled, meridian::Outcome::No) => assert!(no <= m.owed, "No {no} above owed {}", m.owed),
            _ => assert!(yes <= m.owed && no <= m.owed, "supplies {yes}, {no} above owed {}", m.owed),
        }
    }
}
