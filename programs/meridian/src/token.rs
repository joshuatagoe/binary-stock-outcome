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
