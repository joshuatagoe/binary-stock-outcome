//! The admin's instructions (ARCHITECTURE.md §6, instructions 2 to 5) in Mollusk: Update config with the fill
//! limit's cap (M1.01), the two-step admin rotation (D109), Set operator, Pause and Unpause.
mod common;

use {
    anchor_lang::{error::ErrorCode, prelude::Pubkey, solana_program::instruction::Instruction, InstructionData, ToAccountMetas},
    common::{refused_by_anchor, refused_with, Chain},
    meridian::{errors::MeridianError, UpdateConfigArgs},
};

fn admin_ix(c: &Chain, admin: Pubkey, data: Vec<u8>) -> Instruction {
    let metas = meridian::accounts::AdminOnly { config: c.config, admin, event_authority: c.event_authority, program: meridian::ID }.to_account_metas(None);
    Instruction { program_id: meridian::ID, accounts: metas, data }
}

fn config(c: &Chain) -> meridian::Config {
    use anchor_lang::AccountDeserialize;
    meridian::Config::try_deserialize(&mut &c.account(&c.config).unwrap().data[..]).unwrap()
}

#[test]
fn the_admin_sets_the_fill_limit_up_to_the_measured_cap() {
    let mut c = Chain::new(false);
    for (limit, ok) in [(32, true), (10, true), (33, false), (0, false)] {
        let data = meridian::instruction::UpdateConfig { args: UpdateConfigArgs { fill_limit: Some(limit), ..Default::default() } }.data();
        let ix = admin_ix(&c, c.admin, data);
        let r = c.run(&ix);
        if ok {
            assert!(r.program_result.is_ok(), "{limit}: {:?}", r.program_result);
            assert_eq!(config(&c).fill_limit, limit);
        } else {
            assert!(refused_with(&r.program_result, MeridianError::FillLimitTooHigh), "{limit}");
        }
    }
}

#[test]
fn update_config_checks_what_it_sets_and_keeps_the_rest() {
    let mut c = Chain::new(false);
    let before = config(&c);
    let data = meridian::instruction::UpdateConfig { args: UpdateConfigArgs { ladder_bps: Some([200, 400, 800]), ..Default::default() } }.data();
    let ix = admin_ix(&c, c.admin, data);
    assert!(c.run(&ix).program_result.is_ok());
    let after = config(&c);
    assert_eq!(after.ladder_bps, [200, 400, 800]);
    assert_eq!((after.tickers.len(), after.thresholds.max_band_bps), (before.tickers.len(), before.thresholds.max_band_bps));
    let data = meridian::instruction::UpdateConfig { args: UpdateConfigArgs { ladder_bps: Some([400, 200, 800]), ..Default::default() } }.data();
    let ix = admin_ix(&c, c.admin, data);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::InvalidLadder));
}

#[test]
fn only_the_admin_changes_the_config() {
    let mut c = Chain::new(false);
    let operator = c.operator;
    for data in [
        meridian::instruction::UpdateConfig { args: UpdateConfigArgs { fill_limit: Some(10), ..Default::default() } }.data(),
        meridian::instruction::Pause {}.data(),
        meridian::instruction::SetOperator { operator: Pubkey::new_unique() }.data(),
        meridian::instruction::ProposeAdmin { new_admin: Pubkey::new_unique() }.data(),
    ] {
        let ix = admin_ix(&c, operator, data);
        assert!(refused_with(&c.run(&ix).program_result, MeridianError::NotAdmin));
    }
}

#[test]
fn pause_and_unpause() {
    let mut c = Chain::new(false);
    let ix = admin_ix(&c, c.admin, meridian::instruction::Pause {}.data());
    assert!(c.run(&ix).program_result.is_ok());
    assert!(config(&c).paused);
    let ix = admin_ix(&c, c.admin, meridian::instruction::Unpause {}.data());
    assert!(c.run(&ix).program_result.is_ok());
    assert!(!config(&c).paused);
}

#[test]
fn the_admin_rotates_the_operator() {
    let mut c = Chain::new(false);
    let operator = Pubkey::new_unique();
    let ix = admin_ix(&c, c.admin, meridian::instruction::SetOperator { operator }.data());
    assert!(c.run(&ix).program_result.is_ok());
    assert_eq!(config(&c).operator, operator);
}

#[test]
fn a_new_admin_must_accept_before_taking_over() {
    // D109: in two steps, so a typo can't hand the program to a key nobody holds.
    let mut c = Chain::new(false);
    let new_admin = Pubkey::new_unique();
    c.set(new_admin, solana_account::Account { lamports: 1_000_000_000, ..Default::default() });
    let ix = admin_ix(&c, c.admin, meridian::instruction::ProposeAdmin { new_admin }.data());
    assert!(c.run(&ix).program_result.is_ok());
    assert_eq!((config(&c).admin, config(&c).pending_admin), (c.admin, Some(new_admin)));
    let accept = |c: &Chain, signer: Pubkey| {
        let metas = meridian::accounts::AcceptAdmin { config: c.config, new_admin: signer, event_authority: c.event_authority, program: meridian::ID }.to_account_metas(None);
        Instruction { program_id: meridian::ID, accounts: metas, data: meridian::instruction::AcceptAdmin {}.data() }
    };
    let stranger = Pubkey::new_unique();
    let ix = accept(&c, stranger);
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::NotPendingAdmin));
    let ix = accept(&c, new_admin);
    assert!(c.run(&ix).program_result.is_ok());
    assert_eq!((config(&c).admin, config(&c).pending_admin), (new_admin, None));
    let _ = ErrorCode::ConstraintSeeds;
    let _ = refused_by_anchor;
}
