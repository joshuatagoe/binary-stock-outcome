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
    meridian::{
        errors::MeridianError, Book, Config, OrderKind, PlaceOrderArgs, Side, Thresholds, Ticker, BOOK_SEED,
        BOOK_USDC_SEED, BOOK_YES_SEED, CONFIG_SEED, SIDE_CAPACITY, TRADER_CAPACITY,
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
    let ticker = |symbol: &str, b: u8| Ticker { symbol: symbol.into(), feed_id: [b; 32], strike_step_cents: 1000, enabled: true };
    let stocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"];
    let config = Config {
        admin: Pubkey::new_unique(),
        pending_admin: None,
        operator: Pubkey::new_unique(),
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

pub struct Market {
    pub m: Mollusk,
    pub ix: Instruction,
    pub accounts: Vec<(Pubkey, Account)>,
    pub book: Pubkey,
    pub book_usdc: Pubkey,
    pub book_yes: Pubkey,
    pub taker_usdc: Pubkey,
    pub taker_yes: Pubkey,
}

impl Market {
    pub fn account_mut(&mut self, key: Pubkey) -> &mut Account {
        &mut self.accounts.iter_mut().find(|(k, _)| *k == key).unwrap().1
    }
}

/// A book of `o.makers` traders, each resting an offer and a bid of 1 Yes (all 64: offers at 36¢ to 99¢ and bids at
/// 1¢ to 35¢, a full book), and a taker with 1,000 USDC and, for a sell, the Yes it sells.
pub fn full_book(o: Order) -> Market {
    let m = mollusk();
    let market = Pubkey::new_unique();
    let pda = |seed: &[u8]| Pubkey::find_program_address(&[seed, market.as_ref()], &meridian::ID);
    let ((book, bump), (book_usdc, usdc_bump), (book_yes, yes_bump)) = (pda(BOOK_SEED), pda(BOOK_USDC_SEED), pda(BOOK_YES_SEED));
    let mut b: Box<Book> = Box::new(bytemuck::Zeroable::zeroed());
    b.init(market, bump, usdc_bump, yes_bump);
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

    let (usdc_mint_key, yes_mint_key) = (Pubkey::new_unique(), Pubkey::new_unique());
    let (taker_usdc, taker_yes) = (Pubkey::new_unique(), Pubkey::new_unique());
    let config_key = Pubkey::find_program_address(&[CONFIG_SEED], &meridian::ID).0;
    let event_authority = Pubkey::find_program_address(&[b"__event_authority"], &meridian::ID).0;
    let taker_yes_amount = if o.side == Side::Sell { o.quantity as u64 } else { 0 };
    let accounts = vec![
        (config_key, config(&m, usdc_mint_key, o.fill_limit, o.paused)),
        (market, Account::default()),
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
    Market { m, ix, accounts, book, book_usdc, book_yes, taker_usdc, taker_yes }
}

/// The program refused with this error.
pub fn refused_with(result: &ProgramResult, error: MeridianError) -> bool {
    let code = error as u32 + ERROR_CODE_OFFSET;
    matches!(result, ProgramResult::Failure(e) if format!("{e:?}") == format!("Custom({code})"))
}
