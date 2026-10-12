//! Create market (ARCHITECTURE.md §6, instruction 6) in Mollusk: the market and every account it owns, made once, by
//! the operator or the admin, before the open, for an enabled stock and a strike on its step.
mod common;

use {
    anchor_lang::prelude::Pubkey,
    common::{market_pda, meta_680, refused_with, rent, Chain, AT_4_00_PM, AT_9_00, AT_9_30, TOKEN, TOKEN_2022},
    meridian::{
        errors::MeridianError, Book, CreateMarketArgs, MarketStatus, BOOK_SEED, BOOK_USDC_SEED, BOOK_YES_SEED, NO_SEED,
        VAULT_SEED, YES_SEED,
    },
    spl_token_2022_interface::{
        extension::{
            metadata_pointer::MetadataPointer, mint_close_authority::MintCloseAuthority,
            permissioned_burn::PermissionedBurnConfig, BaseStateWithExtensions,
            StateWithExtensions,
        },
        state::Mint,
    },
    spl_token_metadata_interface::state::TokenMetadata,
};

fn address(seed: &[u8], market: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[seed, market.as_ref()], &meridian::ID)
}

/// A token account's mint and owner, the first 64 bytes in both token programs.
fn mint_and_owner(data: &[u8]) -> (Pubkey, Pubkey) {
    (Pubkey::new_from_array(data[0..32].try_into().unwrap()), Pubkey::new_from_array(data[32..64].try_into().unwrap()))
}

#[test]
fn the_operator_creates_the_market_and_every_account_it_owns() {
    let mut c = Chain::new(false);
    let market = c.create_meta_680();
    let m = c.market(&market);
    assert_eq!((m.ticker_bytes(), m.day, m.strike_cents), (&b"META"[..], 20_261_008, 68_000));
    assert_eq!((m.mint_open, m.open, m.close), (AT_9_00, AT_9_30, AT_4_00_PM));
    assert_eq!((m.owed, m.status), (0, MarketStatus::Trading));
    assert_eq!(m.creator, c.operator, "who paid the deposits, for Close book (D50)");
    assert_eq!(m.bump, market_pda(&meta_680()).1, "the canonical bump, found rather than passed in");

    for (seed, side, stored_bump) in [(YES_SEED, "Yes", m.yes_bump), (NO_SEED, "No", m.no_bump)] {
        let (key, bump) = address(seed, &market);
        assert_eq!(stored_bump, bump);
        let account = c.account(&key).unwrap();
        assert_eq!(account.owner, TOKEN_2022);
        assert!(account.lamports >= rent(&c.m, account.data.len()), "{side}: its deposit covers its final size");
        let mint = StateWithExtensions::<Mint>::unpack(&account.data).unwrap();
        assert_eq!(mint.base.decimals, 0);
        assert_eq!(Option::<Pubkey>::from(mint.base.mint_authority), Some(market), "{side}: the market mints");
        assert_eq!(Option::<Pubkey>::from(mint.base.freeze_authority), None, "no freeze authority (D94)");
        let burn = mint.get_extension::<PermissionedBurnConfig>().unwrap();
        assert_eq!(bytemuck::bytes_of(&burn.authority), market.as_ref(), "{side}: only the market co-signs a burn (D94)");
        let close = mint.get_extension::<MintCloseAuthority>().unwrap();
        assert_eq!(bytemuck::bytes_of(&close.close_authority), market.as_ref(), "{side}: the market can close it while empty (D140)");
        let pointer = mint.get_extension::<MetadataPointer>().unwrap();
        assert_eq!(bytemuck::bytes_of(&pointer.metadata_address), key.as_ref(), "{side}: the name lives on the mint");
        let metadata = mint.get_variable_len_extension::<TokenMetadata>().unwrap();
        assert_eq!(metadata.name, format!("META 680+ {side} 10/08"), "D108");
        assert_eq!((metadata.symbol.as_str(), metadata.uri.as_str()), (side.to_uppercase().as_str(), ""), "no picture link (P30)");
    }

    let (vault, vault_bump) = address(VAULT_SEED, &market);
    assert_eq!(m.vault_bump, vault_bump);
    let vault_account = c.account(&vault).unwrap();
    assert_eq!(vault_account.owner, TOKEN);
    assert_eq!(mint_and_owner(&vault_account.data), (c.usdc_mint, market), "a USDC account the market owns");

    let (book, book_bump) = address(BOOK_SEED, &market);
    let book_account = c.account(&book).unwrap();
    assert_eq!(book_account.owner, meridian::ID);
    let b: &Book = bytemuck::from_bytes(&book_account.data[8..]);
    assert_eq!((b.market, b.bump), (market, book_bump));
    assert_eq!((b.book_usdc_bump, b.book_yes_bump), (address(BOOK_USDC_SEED, &market).1, address(BOOK_YES_SEED, &market).1));
    assert_eq!((b.bid_count, b.ask_count), (0, 0));
    let book_usdc = c.account(&address(BOOK_USDC_SEED, &market).0).unwrap();
    assert_eq!((book_usdc.owner, mint_and_owner(&book_usdc.data)), (TOKEN, (c.usdc_mint, book)));
    let book_yes = c.account(&address(BOOK_YES_SEED, &market).0).unwrap();
    assert_eq!((book_yes.owner, mint_and_owner(&book_yes.data)), (TOKEN_2022, (address(YES_SEED, &market).0, book)));
}

#[test]
fn the_admin_may_create_a_market_too() {
    let mut c = Chain::new(false);
    let ix = c.create_market_ix(c.admin, &meta_680());
    let r = c.run(&ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
}

#[test]
fn creating_the_same_market_again_fails() {
    // D56: the address is fixed by ticker, day and strike, so a repeat finds it taken.
    let mut c = Chain::new(false);
    c.create_meta_680();
    let ix = c.create_market_ix(c.operator, &meta_680());
    assert!(!c.run(&ix).program_result.is_ok());
}

#[test]
fn someone_else_cannot_create_a_market() {
    let mut c = Chain::new(false);
    let stranger = Pubkey::new_unique();
    c.set(stranger, solana_account::Account { lamports: 10_000_000_000, ..Default::default() });
    let ix = c.create_market_ix(stranger, &meta_680());
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::NotOperator));
}

fn refused(args: CreateMarketArgs, error: MeridianError) {
    let mut c = Chain::new(false);
    let ix = c.create_market_ix(c.operator, &args);
    let r = c.run(&ix);
    assert!(refused_with(&r.program_result, error), "{args:?}: {:?}", r.program_result);
}

#[test]
fn a_stock_turned_off_or_not_in_the_config_is_refused() {
    refused(CreateMarketArgs { ticker: "XOM".into(), ..meta_680() }, MeridianError::TickerNotEnabled);
    refused(CreateMarketArgs { ticker: "IBM".into(), ..meta_680() }, MeridianError::TickerNotEnabled);
}

#[test]
fn a_strike_off_the_stocks_step_is_refused() {
    refused(CreateMarketArgs { strike_cents: 68_500, ..meta_680() }, MeridianError::InvalidStrike);
    refused(CreateMarketArgs { strike_cents: 0, ..meta_680() }, MeridianError::InvalidStrike);
}

#[test]
fn times_out_of_order_are_refused() {
    refused(CreateMarketArgs { mint_open: AT_9_30 + 1, ..meta_680() }, MeridianError::InvalidTimes);
    // Orders close 5 seconds before the stored close (D102), which must still be after the open.
    refused(CreateMarketArgs { close: AT_9_30 + 5, ..meta_680() }, MeridianError::InvalidTimes);
}

#[test]
fn a_market_is_created_only_before_it_opens() {
    let mut c = Chain::new(false);
    c.at(AT_9_30);
    let ix = c.create_market_ix(c.operator, &meta_680());
    assert!(refused_with(&c.run(&ix).program_result, MeridianError::CreateAfterOpen));
}

#[test]
fn lamports_sent_to_a_future_address_do_not_stop_the_market() {
    // A market's addresses are known in advance; someone could send lamports to one before 8:30. Creation tops it up
    // and adopts it instead of failing (the same rule Anchor's init follows).
    let mut c = Chain::new(false);
    let market = market_pda(&meta_680()).0;
    for seed in [YES_SEED, VAULT_SEED, BOOK_YES_SEED] {
        c.set(address(seed, &market).0, solana_account::Account { lamports: 1, ..Default::default() });
    }
    let ix = c.create_market_ix(c.operator, &meta_680());
    let r = c.run(&ix);
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    let yes = c.account(&address(YES_SEED, &market).0).unwrap();
    assert_eq!(yes.owner, TOKEN_2022);
    assert!(yes.lamports >= rent(&c.m, yes.data.len()));
}
