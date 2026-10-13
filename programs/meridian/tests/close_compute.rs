//! The sweep, Replace quotes and Return to owner at their worst, measured in Mollusk on books the program built itself,
//! as book_compute and no_compute do (D21, M1.01): against the 1,400,000 compute units a transaction may use and the
//! 200,000 an instruction gets without asking for more. Mollusk also enforces a transaction's 64-instruction trace, so
//! each run that succeeds fits it. The sweep's worst batch also runs in LiteSVM behind two compute-budget instructions,
//! which counts the whole trace and reads its events. Run with `-- --nocapture` for the table.
mod common;

use {
    anchor_lang::{
        event::EVENT_IX_TAG_LE,
        prelude::{Clock, Pubkey},
        solana_program::instruction::Instruction,
        AnchorDeserialize, Discriminator,
    },
    common::{config_for, pda, token_account, Chain, Trader, AT_10_16, AT_4_00_PM, AT_8_30, TOKEN, TOKEN_2022},
    litesvm::LiteSVM,
    meridian::{
        events::{CancelReason, OrderCancelled, Redeemed},
        BuyNoArgs, CreateMarketArgs, OrderKind, PlaceOrderArgs, Quote, Side, SIDE_CAPACITY, SWEEP_BATCH, TRADER_CAPACITY,
        YES_SEED,
    },
    solana_account::Account,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const LIMIT: u64 = 1_400_000;
const DEFAULT_BUDGET: u64 = 200_000;
/// A transaction's instruction trace: its own instructions and every call they make (M1.01).
const MAX_TRACE: usize = 64;
const USDC: u64 = 1_000_000;

fn run(c: &mut Chain, ix: &Instruction) -> u64 {
    let r = c.run(ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    r.compute_units_consumed
}

fn place(c: &mut Chain, market: &Pubkey, t: &Trader, side: Side, price: u8, order_id: u64) {
    let ix = c.place_order_ix(market, t, PlaceOrderArgs { side, kind: OrderKind::Limit, price, quantity: 1, order_id });
    run(c, &ix);
}

/// META $680 at 10:16, its book full of paired offers: 64 traders each rest a Buy No limit order of 1 (its Yes offered
/// at 36¢ upward, its No in the book, D142) and a bid for 1 Yes (1¢ to 35¢). The operator is a key that can sign.
fn paired_book(operator: &Keypair) -> (Chain, Pubkey) {
    let mut c = Chain::new(false);
    c.operator = operator.pubkey();
    let config = config_for(&c.m, c.usdc_mint, operator.pubkey(), c.admin, 32, false);
    c.set(c.config, config);
    c.set(operator.pubkey(), Account { lamports: 10_000_000_000, ..Account::default() });
    let market = c.create_meta_680();
    c.at(AT_10_16);
    for i in 0..TRADER_CAPACITY {
        let t = c.trader(&market, 10 * USDC);
        let ix = c.buy_no_ix(&market, &t, BuyNoArgs { kind: OrderKind::Limit, price: 64 - i as u8, quantity: 1, order_id: 1 });
        run(&mut c, &ix);
        place(&mut c, &market, &t, Side::Buy, 1 + (i % 35) as u8, 2);
    }
    let book = c.book(&market);
    assert_eq!((book.ask_count as usize, book.bid_count as usize, book.locked_no()), (SIDE_CAPACITY, SIDE_CAPACITY, 64));
    (c, market)
}

#[test]
fn a_sweep_batch_fits_one_transaction_at_its_worst() {
    // The worst batch is SWEEP_BATCH paired offers: each writes two events (OrderCancelled, then Redeemed), and the
    // batch adds three token calls (burn its Yes, burn its No, move their 1.00s from the vault).
    let operator = Keypair::new();
    let (mut c, market) = paired_book(&operator);
    c.at(AT_4_00_PM);
    let ix = c.sweep_ix(&market, operator.pubkey());
    let mut cus = vec![];
    while c.book(&market).ask_count + c.book(&market).bid_count > 0 {
        cus.push(run(&mut c, &ix));
    }
    let empty = run(&mut c, &ix);
    println!("sweep of a full book, {} calls of at most {SWEEP_BATCH}:", cus.len());
    for (i, cu) in cus.iter().enumerate() {
        println!("  call {}: {cu:>7} CU  {:>5.1}% of 1.4M", i + 1, 100.0 * *cu as f64 / LIMIT as f64);
    }
    println!("  on the empty book: {empty} CU");
    let worst = *cus.iter().max().unwrap();
    assert!(worst <= DEFAULT_BUDGET, "a sweep batch needs {worst} CU, more than the default 200,000");
    assert_eq!(cus.len(), (2 * SIDE_CAPACITY).div_ceil(SWEEP_BATCH));
    assert_eq!(c.market(&market).owed, 0, "every pair closed");

    // The same first batch in LiteSVM, behind a compute-unit limit and price, as the backend's send queue may add.
    let (c, market) = paired_book(&operator);
    let mut svm = LiteSVM::new();
    svm.add_program(meridian::ID, include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/meridian.so"))).unwrap();
    svm.add_program(TOKEN, include_bytes!("fixtures/spl_token.so")).unwrap();
    svm.add_program(TOKEN_2022, include_bytes!("fixtures/spl_token_2022.so")).unwrap();
    for (key, account) in &c.accounts {
        if !account.executable && account.lamports > 0 {
            svm.set_account(*key, account.clone()).unwrap();
        }
    }
    svm.set_account(operator.pubkey(), Account { lamports: 10_000_000_000, ..Account::default() }).unwrap();
    let mut clock: Clock = svm.get_sysvar();
    clock.unix_timestamp = AT_4_00_PM;
    svm.set_sysvar(&clock);
    let budget = anchor_lang::prelude::pubkey!("ComputeBudget111111111111111111111111111111");
    let limit = Instruction { program_id: budget, accounts: vec![], data: [&[2u8][..], &300_000u32.to_le_bytes()].concat() };
    let price = Instruction { program_id: budget, accounts: vec![], data: [&[3u8][..], &1_000u64.to_le_bytes()].concat() };
    let ixs = [limit, price, c.sweep_ix(&market, operator.pubkey())];
    let msg = Message::new_with_blockhash(&ixs, Some(&operator.pubkey()), &svm.latest_blockhash());
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg.clone()), &[&operator]).unwrap();
    let meta = svm.send_transaction(tx).unwrap_or_else(|e| panic!("{:?}\n{}", e.err, e.meta.logs.join("\n")));
    let inner: Vec<_> = meta.inner_instructions.iter().flatten().collect();
    let trace = ixs.len() + inner.len();
    println!("  first batch in LiteSVM with 2 compute-budget instructions: a trace of {trace} of {MAX_TRACE}");
    assert!(trace <= MAX_TRACE);
    let events: Vec<_> = inner.iter().filter(|i| msg.account_keys[i.instruction.program_id_index as usize] == meridian::ID).collect();
    assert_eq!(events.len(), 2 * SWEEP_BATCH, "a cancel and a pair close per paired offer");
    for pair in events.chunks(2) {
        let (cancel, closed) = (&pair[0].instruction.data, &pair[1].instruction.data);
        assert_eq!((&cancel[..8], &cancel[8..16]), (EVENT_IX_TAG_LE, OrderCancelled::DISCRIMINATOR));
        let cancel = OrderCancelled::deserialize(&mut &cancel[16..]).unwrap();
        assert_eq!(&closed[8..16], Redeemed::DISCRIMINATOR);
        let closed = Redeemed::deserialize(&mut &closed[16..]).unwrap();
        assert_eq!((cancel.reason, cancel.side, cancel.quantity), (CancelReason::Sweep, Side::Sell, 1));
        assert_eq!((closed.owner, closed.quantity, closed.usdc), (cancel.owner, 1, USDC), "its pair closed for 1.00");
    }
}

/// `makers` traders, each minting 1 pair and resting an offer of its Yes and a bid for 1, at the prices given by index.
fn fill(c: &mut Chain, market: &Pubkey, makers: usize, offer: impl Fn(usize) -> u8, bid: impl Fn(usize) -> u8) {
    for i in 0..makers {
        let t = c.trader(market, 10 * USDC);
        let ix = c.mint_pairs_ix(market, &t, 1);
        run(c, &ix);
        place(c, market, &t, Side::Sell, offer(i), 1);
        place(c, market, &t, Side::Buy, bid(i), 2);
    }
}

/// A bot with 100.00 USDC that mints `pairs` on `market`.
fn bot(c: &mut Chain, market: &Pubkey, pairs: u64) -> Trader {
    let bot = c.trader(market, 100 * USDC);
    let ix = c.mint_pairs_ix(market, &bot, pairs);
    run(c, &ix);
    bot
}

fn quotes(offers: impl Iterator<Item = u8>, bids: impl Iterator<Item = u8>) -> Vec<Quote> {
    let offers = offers.map(|price| (Side::Sell, price));
    let all: Vec<(Side, u8)> = offers.chain(bids.map(|price| (Side::Buy, price))).collect();
    all.into_iter().enumerate().map(|(i, (side, price))| Quote { side, price, quantity: 1, order_id: i as u64 + 1 }).collect()
}

#[test]
fn replace_quotes_fits_at_its_worst() {
    let mut rows = vec![];

    // The bot's usual batch on one full book: its offer and bid replaced among 63 other makers' 126 orders.
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_10_16);
    fill(&mut c, &market, TRADER_CAPACITY - 1, |i| 37 + i as u8, |i| 1 + (i % 34) as u8);
    let b = bot(&mut c, &market, 1);
    let batch = |c: &Chain| c.replace_quotes_ix(b.owner, b.usdc, &[(market, b.yes, quotes([36].into_iter(), [35].into_iter()))]);
    let ix = batch(&c);
    run(&mut c, &ix);
    assert_eq!((c.book(&market).ask_count as usize, c.book(&market).bid_count as usize), (SIDE_CAPACITY, SIDE_CAPACITY));
    let ix = batch(&c);
    rows.push(("1 book, full: 2 cancelled, 2 placed", run(&mut c, &ix)));

    // The most orders one book's batch can replace within the 64-instruction trace: 2k + 4 (k cancels, k placements,
    // a BalanceReturned, two transfers and the instruction itself), so k = 30. The bot's 15 offers and 15 bids are the
    // best on each side, so each new one goes in at the front of a full side.
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    c.at(AT_10_16);
    let k = 30;
    fill(&mut c, &market, TRADER_CAPACITY - 1 - k / 2 + 1, |i| 51 + (i % 49) as u8, |i| 1 + (i % 20) as u8);
    let b = bot(&mut c, &market, (k / 2) as u64);
    let batch = |c: &Chain| {
        let book_quotes = quotes((36..36 + k as u8 / 2).rev(), 21..21 + k as u8 / 2);
        c.replace_quotes_ix(b.owner, b.usdc, &[(market, b.yes, book_quotes)])
    };
    let ix = batch(&c);
    run(&mut c, &ix);
    assert_eq!((c.book(&market).ask_count as usize, c.book(&market).bid_count as usize), (SIDE_CAPACITY, SIDE_CAPACITY));
    let ix = batch(&c);
    rows.push(("1 book, full: 30 cancelled, 30 placed", run(&mut c, &ix)));

    // A strike ladder: 8 full books, the bot's offer and bid on each (D111): up to 7 trace entries a book, 5 here, since
    // the same prices move no tokens. With 56 accounts it needs the day's lookup table (D110) to fit a transaction's size.
    let mut c = Chain::new(false);
    c.at(AT_8_30);
    let markets: Vec<Pubkey> = (0..8)
        .map(|i| {
            let args = CreateMarketArgs { strike_cents: 65_000 + 1_000 * i, ..common::meta_680() };
            let ix = c.create_market_ix(c.operator, &args);
            run(&mut c, &ix);
            common::market_pda(&args).0
        })
        .collect();
    c.at(AT_10_16);
    let b = c.trader(&markets[0], 100 * USDC);
    let mut books = vec![];
    for market in &markets {
        fill(&mut c, market, TRADER_CAPACITY - 1, |i| 37 + i as u8, |i| 1 + (i % 34) as u8);
        // The bot's own Yes and No accounts on this market's mints.
        let on_market = Trader { yes: Pubkey::new_unique(), no: Pubkey::new_unique(), ..b };
        for (key, seed) in [(on_market.yes, YES_SEED), (on_market.no, meridian::NO_SEED)] {
            let account = token_account(&c.m, TOKEN_2022, pda(seed, market), b.owner, 0);
            c.set(key, account);
        }
        let ix = c.mint_pairs_ix(market, &on_market, 1);
        run(&mut c, &ix);
        books.push((*market, on_market.yes, quotes([36].into_iter(), [35].into_iter())));
    }
    let ix = c.replace_quotes_ix(b.owner, b.usdc, &books);
    run(&mut c, &ix);
    let ix = c.replace_quotes_ix(b.owner, b.usdc, &books);
    rows.push(("8 books, full: 2 cancelled, 2 placed each", run(&mut c, &ix)));

    println!("Replace quotes                               CU  share of 1.4M");
    for (name, cu) in &rows {
        println!("{name:<42} {cu:>8}  {:>5.1}%", 100.0 * *cu as f64 / LIMIT as f64);
        assert!(*cu <= LIMIT, "{name}: {cu} CU is past a transaction's 1,400,000");
    }
    assert!(rows[0].1 <= DEFAULT_BUDGET, "the bot's usual batch needs more than the default 200,000");
}

#[test]
fn return_to_owner_is_cheap() {
    // All three balances, for the 32nd trader in a full book of paired offers: Alice's Buy Yes of 32 reaches its offer
    // (USDC, and the No it releases, D142), and a seller's 32 reach its bid (a Yes).
    let operator = Keypair::new();
    let (mut c, market) = paired_book(&operator);
    let alice = c.trader(&market, 50 * USDC);
    let ix = c.place_order_ix(&market, &alice, PlaceOrderArgs { side: Side::Buy, kind: OrderKind::Market, price: 99, quantity: 32, order_id: 1 });
    run(&mut c, &ix);
    let seller = c.trader(&market, 50 * USDC);
    let ix = c.mint_pairs_ix(&market, &seller, 32);
    run(&mut c, &ix);
    let ix = c.place_order_ix(&market, &seller, PlaceOrderArgs { side: Side::Sell, kind: OrderKind::Market, price: 1, quantity: 32, order_id: 1 });
    run(&mut c, &ix);
    let owner = c.book(&market).traders[31].owner;
    let free = c.free(&market, &owner);
    assert!(free.0 > 0 && free.1 > 0 && free.2 > 0, "{free:?}");
    let t = Trader { owner, usdc: Pubkey::new_unique(), yes: Pubkey::new_unique(), no: Pubkey::new_unique() };
    for (key, program, mint) in [(t.usdc, TOKEN, c.usdc_mint), (t.yes, TOKEN_2022, pda(YES_SEED, &market)), (t.no, TOKEN_2022, pda(meridian::NO_SEED, &market))] {
        let account = token_account(&c.m, program, mint, owner, 0);
        c.set(key, account);
    }
    let ix = c.return_to_owner_ix(&market, &t);
    let cu = run(&mut c, &ix);
    println!("Return to owner of {free:?}: {cu} CU");
    assert!(cu <= DEFAULT_BUDGET);
}
