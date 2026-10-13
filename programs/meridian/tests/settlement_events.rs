//! Record close and Settle's events reach the chain (D62), in LiteSVM: CloseRecorded, MarketSettled, and MarketHeld
//! with each of Settle's two reasons, decoded from the event calls with the program's own types. The price is META's
//! real 4:00:00 PM close of 2026-10-08 (tests/fixtures/pyth-prices.json).
mod common;

use {
    anchor_lang::{event::EVENT_IX_TAG_LE, prelude::*, solana_program::instruction::Instruction, AnchorDeserialize, Discriminator},
    common::{meta_680, pyth, Chain, AT_4_00_PM, LEGACY_RECEIVER, TOKEN, TOKEN_2022, UPGRADED_RECEIVER},
    litesvm::LiteSVM,
    meridian::{
        events::{CloseRecorded, MarketHeld, MarketSettled},
        CreateMarketArgs, HoldReason, Outcome, SettledBy,
    },
    solana_account::Account,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

/// Sends one instruction; returns its events, described, and the compute it used.
fn send(svm: &mut LiteSVM, ix: Instruction, signer: &Keypair) -> (Vec<String>, u64) {
    let msg = Message::new_with_blockhash(&[ix], Some(&signer.pubkey()), &svm.latest_blockhash());
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg.clone()), &[signer]).unwrap();
    let meta = svm.send_transaction(tx).unwrap_or_else(|e| panic!("{:?}\n{}", e.err, e.meta.logs.join("\n")));
    svm.expire_blockhash();
    let events = meta
        .inner_instructions
        .iter()
        .flatten()
        .filter(|i| msg.account_keys[i.instruction.program_id_index as usize] == meridian::ID)
        .map(|i| describe(&i.instruction.data))
        .collect();
    (events, meta.compute_units_consumed)
}

fn describe(data: &[u8]) -> String {
    assert_eq!(&data[..8], EVENT_IX_TAG_LE, "an event call starts with Anchor's tag");
    let (discriminator, mut fields) = (&data[8..16], &data[16..]);
    if discriminator == CloseRecorded::DISCRIMINATOR {
        let e = CloseRecorded::deserialize(&mut fields).unwrap();
        format!("recorded {} {} {}e{} ±{} at {} from {}", e.ticker, e.day, e.price, e.expo, e.conf, e.publish_time, e.price_account)
    } else if discriminator == MarketSettled::DISCRIMINATOR {
        let e = MarketSettled::deserialize(&mut fields).unwrap();
        let by = if e.settled_by == SettledBy::Oracle { "oracle" } else { "?" };
        format!("settled {:?} by {by} on {}e{} ±{} at {}", e.outcome, e.price, e.expo, e.conf, e.publish_time)
    } else if discriminator == MarketHeld::DISCRIMINATOR {
        let e = MarketHeld::deserialize(&mut fields).unwrap();
        format!("held {:?} '{}'", e.reason, e.note)
    } else {
        panic!("not one of these instructions' events: {discriminator:?}")
    }
}

fn set_clock(svm: &mut LiteSVM, unix_timestamp: i64) {
    let mut clock: Clock = svm.get_sysvar();
    clock.unix_timestamp = unix_timestamp;
    svm.set_sysvar(&clock);
}

#[test]
fn recording_settling_and_holding_are_each_recorded() {
    // META $700 settles Yes and META $720.70 (a 1-cent step) is held on its band; AAPL has no recorded price.
    let operator = Keypair::new();
    let mut c = Chain::new(false);
    c.operator = operator.pubkey();
    let mut config = c.config_state();
    config.operator = operator.pubkey();
    c.set_config_state(&config);
    c.set(operator.pubkey(), Account { lamports: 10_000_000_000, ..Account::default() });
    c.use_pyth(vec![LEGACY_RECEIVER, UPGRADED_RECEIVER], 1);
    let yes = c.create(&CreateMarketArgs { strike_cents: 70_000, ..meta_680() });
    let held = c.create(&CreateMarketArgs { strike_cents: 72_070, ..meta_680() });
    let aapl = c.create(&CreateMarketArgs { ticker: "AAPL".into(), strike_cents: 34_000, ..meta_680() });
    let (price, account) = pyth("meta_close_20261008_upgraded");

    let mut svm = LiteSVM::new();
    svm.add_program(meridian::ID, include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/meridian.so"))).unwrap();
    svm.add_program(TOKEN, include_bytes!("fixtures/spl_token.so")).unwrap();
    svm.add_program(TOKEN_2022, include_bytes!("fixtures/spl_token_2022.so")).unwrap();
    for (key, account) in &c.accounts {
        if !account.executable && account.lamports > 0 {
            svm.set_account(*key, account.clone()).unwrap();
        }
    }
    svm.set_account(price, account).unwrap();
    let recorder = Keypair::new();
    svm.set_account(recorder.pubkey(), Account { lamports: 1_000_000_000, ..Account::default() }).unwrap();

    set_clock(&mut svm, AT_4_00_PM + 4);
    let (events, cu) = send(&mut svm, c.record_close_ix(&yes, price, recorder.pubkey()), &recorder);
    assert_eq!(events, vec![format!("recorded META 20261008 72073285e-5 ±19645 at {AT_4_00_PM} from {price}")]);
    println!("Record close, first price of the day: {cu} CU");

    set_clock(&mut svm, AT_4_00_PM + 60);
    let (events, cu) = send(&mut svm, c.settle_ix(&yes, operator.pubkey()), &operator);
    assert_eq!(events, vec![format!("settled {:?} by oracle on 72073285e-5 ±19645 at {AT_4_00_PM}", Outcome::Yes)]);
    println!("Settle, settled: {cu} CU");
    let (events, cu) = send(&mut svm, c.settle_ix(&held, operator.pubkey()), &operator);
    assert_eq!(events, vec![format!("held {:?} ''", HoldReason::BandOnStrike)]);
    println!("Settle, held on the band: {cu} CU");

    set_clock(&mut svm, AT_4_00_PM + 15 * 60);
    let (events, cu) = send(&mut svm, c.settle_ix(&aapl, operator.pubkey()), &operator);
    assert_eq!(events, vec![format!("held {:?} ''", HoldReason::NoPrice)]);
    println!("Settle, held for no price: {cu} CU");
}
