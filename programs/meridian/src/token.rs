//! Moving tokens: USDC on the classic token program, Yes and No on Token-2022 (ARCHITECTURE.md §5), both through
//! spl-token-2022-interface's instruction builders, which serve either program (§9).
use anchor_lang::{prelude::*, solana_program::program::invoke_signed};

pub const TOKEN_PROGRAM_ID: Pubkey = pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
pub const TOKEN_2022_PROGRAM_ID: Pubkey = pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
pub const USDC_DECIMALS: u8 = 6;
/// Yes and No are whole contracts (§5).
pub const OUTCOME_DECIMALS: u8 = 0;

/// A token account's balance: the 8 bytes after its mint and owner, in both token programs.
pub fn amount(account: &AccountInfo) -> Result<u64> {
    let data = account.try_borrow_data()?;
    let bytes: [u8; 8] = data.get(64..72).and_then(|b| b.try_into().ok()).ok_or(ProgramError::InvalidAccountData)?;
    Ok(u64::from_le_bytes(bytes))
}

/// Transfers `amount` with TransferChecked, so the token program checks the mint and its decimals. Nothing is sent
/// for 0.
#[allow(clippy::too_many_arguments)]
pub fn transfer<'info>(
    program: &AccountInfo<'info>,
    from: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    amount: u64,
    decimals: u8,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let ix = spl_token_2022_interface::instruction::transfer_checked(
        program.key,
        from.key,
        mint.key,
        to.key,
        authority.key,
        &[],
        amount,
        decimals,
    )?;
    invoke_signed(&ix, &[from.clone(), mint.clone(), to.clone(), authority.clone(), program.clone()], signer_seeds)?;
    Ok(())
}

/// A token account's owner: the 32 bytes after its mint, in both token programs.
pub fn owner(account: &AccountInfo) -> Result<Pubkey> {
    let data = account.try_borrow_data()?;
    let bytes: [u8; 32] = data.get(32..64).and_then(|b| b.try_into().ok()).ok_or(ProgramError::InvalidAccountData)?;
    Ok(Pubkey::new_from_array(bytes))
}

/// Whether `holder` can close this token account: it is empty, `holder` owns it, and no other key holds its close
/// authority (in both token programs, a 4-byte "some" flag at byte 129 and the key after it). A close that would
/// fail is skipped, so it can never undo the redeem it follows.
pub fn can_close(account: &AccountInfo, holder: &Pubkey) -> Result<bool> {
    let data = account.try_borrow_data()?;
    let close = data.get(129..165).ok_or(ProgramError::InvalidAccountData)?;
    let free = close[..4] == [0, 0, 0, 0] || close[4..] == holder.to_bytes();
    drop(data);
    Ok(amount(account)? == 0 && owner(account)? == *holder && free)
}

/// A mint's supply: the 8 bytes after its mint authority, in both token programs.
pub fn supply(mint: &AccountInfo) -> Result<u64> {
    let data = mint.try_borrow_data()?;
    let bytes: [u8; 8] = data.get(36..44).and_then(|b| b.try_into().ok()).ok_or(ProgramError::InvalidAccountData)?;
    Ok(u64::from_le_bytes(bytes))
}

/// Creates `account` at one of this program's addresses, with `lamports` and `space`, owned by `owner`. Anyone can
/// send lamports to an address before it exists, and the addresses here are predictable, so an address that already
/// holds some is topped up, given its space and assigned instead, as Anchor's own `init` does; otherwise a few
/// lamports could stop a market from ever being created.
#[allow(clippy::too_many_arguments)]
pub fn create_account<'info>(
    system_program: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    account: &AccountInfo<'info>,
    lamports: u64,
    space: u64,
    owner: &Pubkey,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    use anchor_lang::system_program::{self as system, Allocate, Assign, CreateAccount, Transfer};
    let program = system_program.key();
    if account.lamports() == 0 {
        let accounts = CreateAccount { from: payer.clone(), to: account.clone() };
        return system::create_account(CpiContext::new_with_signer(program, accounts, signer_seeds), lamports, space, owner);
    }
    let missing = lamports.saturating_sub(account.lamports());
    if missing > 0 {
        let accounts = Transfer { from: payer.clone(), to: account.clone() };
        system::transfer(CpiContext::new(program, accounts), missing)?;
    }
    system::allocate(CpiContext::new_with_signer(program, Allocate { account_to_allocate: account.clone() }, signer_seeds), space)?;
    system::assign(CpiContext::new_with_signer(program, Assign { account_to_assign: account.clone() }, signer_seeds), owner)
}

/// Makes `account` a token account of `mint`, owned by `owner`, in either token program.
pub fn initialize_account<'info>(
    program: &AccountInfo<'info>,
    account: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    owner: &Pubkey,
) -> Result<()> {
    let ix = spl_token_2022_interface::instruction::initialize_account3(program.key, account.key, mint.key, owner)?;
    invoke_signed(&ix, &[account.clone(), mint.clone(), program.clone()], &[])?;
    Ok(())
}

/// Mints `amount` to `to`, signed by the mint's authority.
pub fn mint_to<'info>(
    program: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let ix = spl_token_2022_interface::instruction::mint_to(program.key, mint.key, to.key, authority.key, &[], amount)?;
    invoke_signed(&ix, &[mint.clone(), to.clone(), authority.clone(), program.clone()], signer_seeds)?;
    Ok(())
}

/// Burns `amount` of the holder's tokens with Permissioned Burn: the holder signs, and so does the burn authority,
/// which only this program can sign for (D94).
#[allow(clippy::too_many_arguments)]
pub fn permissioned_burn<'info>(
    program: &AccountInfo<'info>,
    account: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    burn_authority: &AccountInfo<'info>,
    holder: &AccountInfo<'info>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let ix = spl_token_2022_interface::extension::permissioned_burn::instruction::burn_checked(
        program.key,
        account.key,
        mint.key,
        burn_authority.key,
        holder.key,
        &[],
        amount,
        OUTCOME_DECIMALS,
    )?;
    invoke_signed(&ix, &[account.clone(), mint.clone(), burn_authority.clone(), holder.clone(), program.clone()], signer_seeds)?;
    Ok(())
}

/// Closes an empty token account; its deposit goes to `destination`. The owner signs.
pub fn close_account<'info>(
    program: &AccountInfo<'info>,
    account: &AccountInfo<'info>,
    destination: &AccountInfo<'info>,
    owner: &AccountInfo<'info>,
) -> Result<()> {
    let ix = spl_token_2022_interface::instruction::close_account(program.key, account.key, destination.key, owner.key, &[])?;
    invoke_signed(&ix, &[account.clone(), destination.clone(), owner.clone(), program.clone()], &[])?;
    Ok(())
}
