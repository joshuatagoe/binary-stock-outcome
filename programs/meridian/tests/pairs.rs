//! Mint pairs and Redeem's pairs mode (ARCHITECTURE.md §6, instructions 8 and 9) in Mollusk, with the vault rules
//! checked after each: the vault holds at least 1.00 per pair owed, and no token's supply exceeds it (D64).
mod common;

use {
    anchor_lang::{error::ErrorCode, prelude::Pubkey},
    common::{config_for, meta_680, pda, refused_by_anchor, refused_with, Chain, AT_4_00_PM, AT_9_00, TOKEN_2022},
    meridian::{errors::MeridianError, CreateMarketArgs, MarketStatus, RedeemMode, NO_SEED, VAULT_SEED, YES_SEED},
};

const USDC: u64 = 1_000_000;

/// META $680, created at 8:30, and Dave with 20.00 USDC, at 9:10 (§3's running example).
fn dave_at_9_10(paused: bool) -> (Chain, anchor_lang::prelude::Pubkey, common::Trader) {
    let mut c = Chain::new(paused);
    let market = c.create_meta_680();
    c.at(AT_9_00 + 600);
    let dave = c.trader(&market, 20 * USDC);
    (c, market, dave)
}

#[test]
fn minting_puts_1_usdc_per_pair_in_the_vault_and_mints_both() {
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    let r = c.run(&ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    assert_eq!(c.amount(&pda(VAULT_SEED, &market)), 10 * USDC);
    assert_eq!(c.amount(&dave.usdc), 10 * USDC);
    assert_eq!((c.amount(&dave.yes), c.amount(&dave.no)), (10, 10));
    assert_eq!((c.supply(&pda(YES_SEED, &market)), c.supply(&pda(NO_SEED, &market))), (10, 10));
    assert_eq!(c.market(&market).owed, 10);
}

#[test]
fn minting_opens_at_9_00() {
    let (mut c, market, dave) = dave_at_9_10(false);
    c.at(AT_9_00 - 1);
    let ix = c.mint_pairs_ix(&market, &dave, 1);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::NotOpenYet));
    c.at(AT_9_00);
    assert!(c.run(&ix).program_result.is_ok());
}

#[test]
fn minting_closes_with_orders_5_seconds_before_the_close() {
    // D43, D102.
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 1);
    c.at(AT_4_00_PM - 6);
    assert!(c.run(&ix).program_result.is_ok());
    c.at(AT_4_00_PM - 5);
    let ix = c.mint_pairs_ix(&market, &dave, 1);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::OrdersClosed));
}

#[test]
fn minting_stops_while_paused() {
    let (mut c, market, dave) = dave_at_9_10(true);
    let ix = c.mint_pairs_ix(&market, &dave, 1);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::Paused));
}

#[test]
fn a_quantity_of_0_is_refused() {
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 0);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::InvalidQuantity));
}

#[test]
fn the_minters_usdc_account_cannot_be_the_vault() {
    // D30's duplicate-account attack.
    let (mut c, market, mut dave) = dave_at_9_10(false);
    dave.usdc = pda(VAULT_SEED, &market);
    let ix = c.mint_pairs_ix(&market, &dave, 1);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::DuplicateAccount));
}

#[test]
fn a_donation_to_the_vault_does_not_stop_minting() {
    let (mut c, market, dave) = dave_at_9_10(false);
    let vault = pda(VAULT_SEED, &market);
    c.set_amount(&vault, 1);
    let ix = c.mint_pairs_ix(&market, &dave, 2);
    assert!(c.run(&ix).program_result.is_ok());
    assert_eq!(c.amount(&vault), 2 * USDC + 1);
}

#[test]
fn a_vault_holding_less_than_it_owes_refuses_every_mint() {
    // Any bug that left the vault short would show here, after the instruction (D64).
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    c.run(&ix);
    c.set_amount(&pda(VAULT_SEED, &market), 10 * USDC - 1);
    let ix = c.mint_pairs_ix(&market, &dave, 1);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::VaultShort));
}

#[test]
fn closing_pairs_returns_1_usdc_each() {
    // D38: Dave closes 4 of his 10 pairs.
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    c.run(&ix);
    let ix = c.redeem_ix(&market, &dave, RedeemMode::Pairs, 4);
    let r = c.run(&ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    assert_eq!(c.amount(&dave.usdc), 14 * USDC);
    assert_eq!((c.amount(&dave.yes), c.amount(&dave.no)), (6, 6));
    assert_eq!(c.amount(&pda(VAULT_SEED, &market)), 6 * USDC);
    assert_eq!((c.supply(&pda(YES_SEED, &market)), c.market(&market).owed), (6, 6));
}

#[test]
fn closing_every_pair_closes_the_emptied_accounts_and_returns_their_deposits() {
    // D94: emptied token accounts are closed, and their deposits go back to the holder.
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    c.run(&ix);
    let before = c.account(&dave.owner).unwrap().lamports;
    let deposits = c.account(&dave.yes).unwrap().lamports + c.account(&dave.no).unwrap().lamports;
    let ix = c.redeem_ix(&market, &dave, RedeemMode::Pairs, 10);
    let r = c.run(&ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    assert_eq!(c.account(&dave.yes).unwrap().lamports, 0);
    assert_eq!(c.account(&dave.no).unwrap().lamports, 0);
    assert_eq!(c.account(&dave.owner).unwrap().lamports, before + deposits);
    assert_eq!((c.amount(&dave.usdc), c.market(&market).owed), (20 * USDC, 0));
}

#[test]
fn pairs_close_while_paused_and_after_the_close() {
    // D68: pause never traps money; D38: pairs close any time before the result.
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    c.run(&ix);
    let (config, usdc_mint, operator, admin) = (c.config, c.usdc_mint, c.operator, c.admin);
    let paused = config_for(&c.m, usdc_mint, operator, admin, 32, true);
    c.set(config, paused);
    c.at(AT_4_00_PM + 1800);
    let ix = c.redeem_ix(&market, &dave, RedeemMode::Pairs, 3);
    assert!(c.run(&ix).program_result.is_ok());
    let mut m = c.market(&market);
    m.status = MarketStatus::UnderReview;
    c.set_market(&market, &m);
    let ix = c.redeem_ix(&market, &dave, RedeemMode::Pairs, 3);
    assert!(c.run(&ix).program_result.is_ok(), "Under review included");
}

#[test]
fn pairs_cannot_close_once_settled() {
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    c.run(&ix);
    let mut m = c.market(&market);
    m.status = MarketStatus::Settled;
    c.set_market(&market, &m);
    let ix = c.redeem_ix(&market, &dave, RedeemMode::Pairs, 1);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::MarketSettled));
}

#[test]
fn winning_and_losing_tokens_wait_for_a_result() {
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    c.run(&ix);
    for mode in [RedeemMode::Winning, RedeemMode::Losing] {
        let ix = c.redeem_ix(&market, &dave, mode, 1);
        assert!(refused_with(&c.run(&ix).program_result, MeridianError::NotFinal), "{mode:?}");
    }
}

#[test]
fn a_supply_above_what_is_owed_is_caught() {
    // The counter and the mints must agree (D64): here the counter was made to say 5 while 10 pairs exist.
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    c.run(&ix);
    let mut m = c.market(&market);
    m.owed = 5;
    c.set_market(&market, &m);
    let ix = c.redeem_ix(&market, &dave, RedeemMode::Pairs, 1);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::SupplyOverOwed));
}

// The card's negative cases: wrong signer, swapped accounts, accounts passed twice (D30).

#[test]
fn someone_elses_usdc_cannot_pay_for_pairs() {
    let (mut c, market, dave) = dave_at_9_10(false);
    let mut eve = c.trader(&market, 0);
    eve.usdc = dave.usdc;
    let ix = c.mint_pairs_ix(&market, &eve, 1);
    assert!(!c.run(&ix).program_result.is_ok(), "the token program refuses Eve spending Dave's USDC");
    assert_eq!(c.amount(&dave.usdc), 20 * USDC);
}

#[test]
fn minted_tokens_go_only_to_the_minters_own_accounts() {
    let (mut c, market, mut dave) = dave_at_9_10(false);
    let eve = c.trader(&market, 0);
    dave.yes = eve.yes;
    let ix = c.mint_pairs_ix(&market, &dave, 1);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::NotYourAccount));
}

#[test]
fn someone_else_cannot_redeem_daves_pairs() {
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    c.run(&ix);
    let mut eve = c.trader(&market, 0);
    (eve.yes, eve.no) = (dave.yes, dave.no);
    let ix = c.redeem_ix(&market, &eve, RedeemMode::Pairs, 1);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::NotYourAccount));
    let mut eve = c.trader(&market, 0);
    eve.usdc = dave.usdc;
    let ix = c.redeem_ix(&market, &eve, RedeemMode::Pairs, 1);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::NotYourAccount), "paying Dave's account from Eve's tokens");
}

#[test]
fn yes_and_no_swapped_are_refused() {
    let (mut c, market, mut dave) = dave_at_9_10(false);
    (dave.yes, dave.no) = (dave.no, dave.yes);
    let ix = c.mint_pairs_ix(&market, &dave, 1);
    assert!(!c.run(&ix).program_result.is_ok(), "the token program refuses minting Yes into a No account");
}

#[test]
fn another_markets_vault_or_mints_are_refused() {
    let (mut c, market, dave) = dave_at_9_10(false);
    c.at(AT_9_00 - 1800);
    let other = CreateMarketArgs { strike_cents: 69_000, ..meta_680() };
    let ix = c.create_market_ix(c.operator, &other);
    assert!(c.run(&ix).program_result.is_ok());
    c.at(AT_9_00 + 600);
    let other_market = common::market_pda(&other).0;
    for (seed, label) in [(VAULT_SEED, "vault"), (YES_SEED, "Yes mint"), (NO_SEED, "No mint")] {
        let mut ix = c.mint_pairs_ix(&market, &dave, 1);
        let ours = pda(seed, &market);
        let meta = ix.accounts.iter_mut().find(|m| m.pubkey == ours).unwrap();
        meta.pubkey = pda(seed, &other_market);
        assert!(refused_by_anchor(&c.run(&ix).program_result, ErrorCode::ConstraintSeeds), "META 690's {label}");
    }
}

#[test]
fn a_usdc_mint_other_than_configs_is_refused() {
    let (mut c, market, dave) = dave_at_9_10(false);
    let mut ix = c.mint_pairs_ix(&market, &dave, 1);
    let usdc_mint = c.usdc_mint;
    let meta = ix.accounts.iter_mut().find(|m| m.pubkey == usdc_mint).unwrap();
    meta.pubkey = Pubkey::new_unique();
    assert!(refused_by_anchor(&c.run(&ix).program_result, ErrorCode::ConstraintAddress));
}

#[test]
fn accounts_passed_twice_are_refused() {
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    c.run(&ix);
    let twice = |c: &Chain, t: &common::Trader, mint: bool| {
        if mint { c.mint_pairs_ix(&market, t, 1) } else { c.redeem_ix(&market, t, RedeemMode::Pairs, 1) }
    };
    let same_yes_no = common::Trader { owner: dave.owner, usdc: dave.usdc, yes: dave.yes, no: dave.yes };
    let vault_as_usdc = common::Trader { owner: dave.owner, usdc: pda(VAULT_SEED, &market), yes: dave.yes, no: dave.no };
    for (t, mint, label) in [(&same_yes_no, true, "Mint: Yes as No"), (&same_yes_no, false, "Redeem: Yes as No"), (&vault_as_usdc, false, "Redeem: the vault as the holder's USDC")] {
        let ix = twice(&c, t, mint);
        assert!(refused_with(&c.run(&ix).program_result, MeridianError::DuplicateAccount), "{label}");
    }
}

#[test]
fn a_holder_cannot_burn_its_tokens_alone() {
    // §5: burning needs the program's co-signature (D94); Token-2022 refuses a plain burn of a Permissioned Burn token.
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    c.run(&ix);
    let burn = spl_token_2022_interface::instruction::burn_checked(&TOKEN_2022, &dave.yes, &pda(YES_SEED, &market), &dave.owner, &[], 1, 0).unwrap();
    assert!(!c.run(&burn).program_result.is_ok());
    assert_eq!(c.amount(&dave.yes), 10);
}

#[test]
fn an_account_whose_close_authority_is_someone_else_is_left_open() {
    // The close is skipped rather than failing, so it never undoes the redeem (D68: a way out is never blocked).
    let (mut c, market, dave) = dave_at_9_10(false);
    let ix = c.mint_pairs_ix(&market, &dave, 10);
    c.run(&ix);
    let mut yes = c.account(&dave.yes).unwrap().clone();
    yes.data[129..133].copy_from_slice(&1u32.to_le_bytes());
    yes.data[133..165].copy_from_slice(Pubkey::new_unique().as_ref());
    c.set(dave.yes, yes);
    let ix = c.redeem_ix(&market, &dave, RedeemMode::Pairs, 10);
    let r = c.run(&ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    assert!(c.account(&dave.yes).unwrap().lamports > 0, "left open, empty");
    assert_eq!(c.amount(&dave.yes), 0);
    assert_eq!(c.account(&dave.no).unwrap().lamports, 0, "the No account had no such authority and closed");
}
