//! Initialize Config (ARCHITECTURE.md §6, instruction 1) in LiteSVM.
//! Build first (`anchor build`): the tests load target/deploy/meridian.so.
use {
    anchor_lang::{
        error::ERROR_CODE_OFFSET,
        prelude::Pubkey,
        solana_program::{bpf_loader_upgradeable, instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, Space, ToAccountMetas,
    },
    litesvm::LiteSVM,
    meridian::{errors::MeridianError, Config, InitializeConfigArgs, Thresholds, Ticker},
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
    std::str::FromStr,
};

const MAINNET_USDC: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEVNET_USDC: &str = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

struct Setup {
    svm: LiteSVM,
    upgrade_key: Keypair,
}

/// Loads the program with `upgrade_key` as its upgrade authority. LiteSVM's add_program leaves the
/// authority empty (AR.03), so the test writes it into ProgramData, whose first 45 bytes are the
/// loader's header: a 4-byte tag, an 8-byte slot, then an optional 32-byte key (1 byte for "some").
fn setup(with_upgrade_key: bool) -> Setup {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/meridian.so"));
    svm.add_program(meridian::id(), bytes).unwrap();
    let upgrade_key = Keypair::new();
    svm.airdrop(&upgrade_key.pubkey(), 10_000_000_000).unwrap();
    if with_upgrade_key {
        let address = program_data_address();
        let mut account = svm.get_account(&address).unwrap();
        account.data[12] = 1;
        account.data[13..45].copy_from_slice(upgrade_key.pubkey().as_ref());
        svm.set_account(address, account).unwrap();
    }
    Setup { svm, upgrade_key }
}

fn program_data_address() -> Pubkey {
    Pubkey::find_program_address(&[meridian::id().as_ref()], &bpf_loader_upgradeable::ID).0
}

fn config_address() -> Pubkey {
    Pubkey::find_program_address(&[meridian::CONFIG_SEED], &meridian::id()).0
}

fn ticker(symbol: &str, feed_byte: u8) -> Ticker {
    Ticker { symbol: symbol.into(), feed_id: [feed_byte; 32], strike_step_cents: 1000, enabled: true }
}

/// ARCHITECTURE.md §11's devnet values.
fn args() -> InitializeConfigArgs {
    InitializeConfigArgs {
        admin: Pubkey::new_unique(),
        operator: Pubkey::new_unique(),
        usdc_mint: Pubkey::from_str(DEVNET_USDC).unwrap(),
        pyth_receivers: vec![
            Pubkey::from_str("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ").unwrap(),
            Pubkey::from_str("rec2HHDDnjLfj4kE7VyEtFA1HPGQLK33259532cRyHp").unwrap(),
        ],
        tickers: vec![ticker("META", 0x78), ticker("AAPL", 0x49)],
        ladder_bps: [300, 600, 900],
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
    }
}

fn initialize(s: &mut Setup, signer: &Keypair, args: InitializeConfigArgs) -> litesvm::types::TransactionResult {
    let ix = Instruction::new_with_bytes(
        meridian::id(),
        &meridian::instruction::InitializeConfig { args }.data(),
        meridian::accounts::InitializeConfig {
            authority: signer.pubkey(),
            config: config_address(),
            program: meridian::id(),
            program_data: program_data_address(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    let msg = Message::new_with_blockhash(&[ix], Some(&signer.pubkey()), &s.svm.latest_blockhash());
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[signer]).unwrap();
    let result = s.svm.send_transaction(tx);
    s.svm.expire_blockhash();
    result
}

fn error_code(result: litesvm::types::TransactionResult) -> String {
    format!("{:?}", result.expect_err("expected the instruction to fail").err)
}

fn custom(e: MeridianError) -> String {
    format!("Custom({})", e as u32 + ERROR_CODE_OFFSET)
}

#[test]
fn the_upgrade_key_initializes_the_full_config_once() {
    let mut s = setup(true);
    let key = s.upgrade_key.insecure_clone();
    let args = args();
    let meta = initialize(&mut s, &key, args.clone()).expect("initialize should succeed");
    assert!(meta.logs.iter().any(|l| l.starts_with("Program data: ")), "ConfigInitialized is emitted");

    let account = s.svm.get_account(&config_address()).unwrap();
    let config = Config::try_deserialize(&mut account.data.as_slice()).unwrap();
    assert_eq!(config.admin, args.admin);
    assert_eq!(config.pending_admin, None);
    assert_eq!(config.operator, args.operator);
    assert_eq!(config.usdc_mint, args.usdc_mint);
    assert_eq!(config.pyth_receivers, args.pyth_receivers);
    assert_eq!(config.tickers, args.tickers);
    assert_eq!(config.ladder_bps, [300, 600, 900]);
    assert!(!config.paused);
    assert_eq!(config.thresholds, args.thresholds);
    assert_eq!(config.fill_limit, 0);
    assert_eq!(account.data.len(), 8 + Config::INIT_SPACE);
    println!("Config account size: {} bytes", account.data.len());

    let second = initialize(&mut s, &key, args);
    assert!(second.is_err(), "a second Initialize is refused");
}

#[test]
fn another_signer_is_refused() {
    let mut s = setup(true);
    let stranger = Keypair::new();
    s.svm.airdrop(&stranger.pubkey(), 10_000_000_000).unwrap();
    assert!(error_code(initialize(&mut s, &stranger, args())).contains(&custom(MeridianError::NotUpgradeAuthority)));
}

#[test]
fn a_program_with_no_upgrade_key_cannot_be_initialized() {
    let mut s = setup(false);
    let key = s.upgrade_key.insecure_clone();
    assert!(error_code(initialize(&mut s, &key, args())).contains(&custom(MeridianError::NotUpgradeAuthority)));
}

#[test]
fn the_devnet_build_refuses_mainnet_usdc() {
    let mut s = setup(true);
    let key = s.upgrade_key.insecure_clone();
    let mut a = args();
    a.usdc_mint = Pubkey::from_str(MAINNET_USDC).unwrap();
    assert!(error_code(initialize(&mut s, &key, a)).contains(&custom(MeridianError::MainnetUsdcOnDevnet)));
}

#[test]
fn bad_settings_are_refused() {
    let cases: Vec<(&str, Box<dyn Fn(&mut InitializeConfigArgs)>, MeridianError)> = vec![
        ("missing admin", Box::new(|a| a.admin = Pubkey::default()), MeridianError::MissingKey),
        ("three receivers", Box::new(|a| a.pyth_receivers.push(Pubkey::new_unique())), MeridianError::InvalidReceivers),
        ("no receivers", Box::new(|a| a.pyth_receivers.clear()), MeridianError::InvalidReceivers),
        ("same receiver twice", Box::new(|a| a.pyth_receivers[1] = a.pyth_receivers[0]), MeridianError::InvalidReceivers),
        ("nine tickers", Box::new(|a| a.tickers = (0..9u8).map(|i| ticker(&format!("T{}", (b'A' + i) as char), i + 1)).collect()), MeridianError::InvalidTickers),
        ("the same ticker twice", Box::new(|a| a.tickers[1].symbol = "META".into()), MeridianError::InvalidTickers),
        ("a lower-case ticker", Box::new(|a| a.tickers[0].symbol = "meta".into()), MeridianError::InvalidTickers),
        ("a zero strike step", Box::new(|a| a.tickers[0].strike_step_cents = 0), MeridianError::InvalidTickers),
        ("an empty feed ID", Box::new(|a| a.tickers[0].feed_id = [0; 32]), MeridianError::InvalidTickers),
        ("a falling ladder", Box::new(|a| a.ladder_bps = [600, 300, 900]), MeridianError::InvalidLadder),
        ("a band over 100%", Box::new(|a| a.thresholds.max_band_bps = 10_001), MeridianError::InvalidThresholds),
        ("no publish window", Box::new(|a| a.thresholds.publish_window_secs = 0), MeridianError::InvalidThresholds),
    ];
    for (name, change, expected) in cases {
        let mut s = setup(true);
        let key = s.upgrade_key.insecure_clone();
        let mut a = args();
        change(&mut a);
        let got = error_code(initialize(&mut s, &key, a));
        assert!(got.contains(&custom(expected)), "{name}: got {got}");
    }
}
