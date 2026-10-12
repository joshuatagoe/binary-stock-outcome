//! Create market, Mint pairs and Redeem's events reach the chain (D62): three transactions in LiteSVM, the event
//! calls inside each decoded with the program's own types.
mod common;

use {
    anchor_lang::{event::EVENT_IX_TAG_LE, prelude::Clock, AnchorDeserialize, Discriminator},
    common::{config_for, pda, token_account, Chain, AT_8_30, AT_9_00, TOKEN, TOKEN_2022},
    litesvm::LiteSVM,
    meridian::{
        events::{MarketCreated, PairsMinted, Redeemed},
        RedeemMode, NO_SEED, YES_SEED,
    },
    solana_account::Account,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

fn send(svm: &mut LiteSVM, ix: anchor_lang::solana_program::instruction::Instruction, signer: &Keypair) -> Vec<String> {
    let msg = Message::new_with_blockhash(&[ix], Some(&signer.pubkey()), &svm.latest_blockhash());
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg.clone()), &[signer]).unwrap();
    let meta = svm.send_transaction(tx).unwrap_or_else(|e| panic!("{:?}\n{}", e.err, e.meta.logs.join("\n")));
    svm.expire_blockhash();
    meta.inner_instructions
        .iter()
        .flatten()
        .filter(|i| msg.account_keys[i.instruction.program_id_index as usize] == meridian::ID)
        .map(|i| describe(&i.instruction.data))
        .collect()
}

fn describe(data: &[u8]) -> String {
    assert_eq!(&data[..8], EVENT_IX_TAG_LE, "an event call starts with Anchor's tag");
    let (discriminator, mut fields) = (&data[8..16], &data[16..]);
    if discriminator == MarketCreated::DISCRIMINATOR {
        let e = MarketCreated::deserialize(&mut fields).unwrap();
        format!("created {} {} {}", e.ticker, e.day, e.strike_cents)
    } else if discriminator == PairsMinted::DISCRIMINATOR {
        format!("minted {}", PairsMinted::deserialize(&mut fields).unwrap().quantity)
    } else if discriminator == Redeemed::DISCRIMINATOR {
        let e = Redeemed::deserialize(&mut fields).unwrap();
        format!("redeemed {:?} {} for {}", e.mode, e.quantity, e.usdc)
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
fn creating_minting_and_closing_pairs_are_each_recorded() {
    let mut c = Chain::new(false);
    let operator = Keypair::new();
    c.operator = operator.pubkey();
    let config = config_for(&c.m, c.usdc_mint, operator.pubkey(), c.admin, 32, false);
    c.set(c.config, config);
    c.set(operator.pubkey(), Account { lamports: 10_000_000_000, ..Account::default() });

    let mut svm = LiteSVM::new();
    svm.add_program(meridian::ID, include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/meridian.so"))).unwrap();
    svm.add_program(TOKEN, include_bytes!("fixtures/spl_token.so")).unwrap();
    svm.add_program(TOKEN_2022, include_bytes!("fixtures/spl_token_2022.so")).unwrap();
    for (key, account) in &c.accounts {
        if !account.executable && account.lamports > 0 {
            svm.set_account(*key, account.clone()).unwrap();
        }
    }
    set_clock(&mut svm, AT_8_30);
    let ix = c.create_market_ix(operator.pubkey(), &common::meta_680());
    assert_eq!(send(&mut svm, ix, &operator), vec!["created META 20261008 68000"]);

    let market = common::market_pda(&common::meta_680()).0;
    let dave = Keypair::new();
    let t = common::Trader { owner: dave.pubkey(), usdc: Keypair::new().pubkey(), yes: Keypair::new().pubkey(), no: Keypair::new().pubkey() };
    svm.set_account(dave.pubkey(), Account { lamports: 1_000_000_000, ..Account::default() }).unwrap();
    svm.set_account(t.usdc, token_account(&c.m, TOKEN, c.usdc_mint, dave.pubkey(), 20_000_000)).unwrap();
    svm.set_account(t.yes, token_account(&c.m, TOKEN_2022, pda(YES_SEED, &market), dave.pubkey(), 0)).unwrap();
    svm.set_account(t.no, token_account(&c.m, TOKEN_2022, pda(NO_SEED, &market), dave.pubkey(), 0)).unwrap();
    set_clock(&mut svm, AT_9_00 + 600);
    assert_eq!(send(&mut svm, c.mint_pairs_ix(&market, &t, 10), &dave), vec!["minted 10"]);
    assert_eq!(send(&mut svm, c.redeem_ix(&market, &t, RedeemMode::Pairs, 4), &dave), vec!["redeemed Pairs 4 for 4000000"]);
}
