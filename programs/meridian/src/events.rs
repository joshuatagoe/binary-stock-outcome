use anchor_lang::prelude::*;

/// Instruction 1's event (ARCHITECTURE.md §6).
#[event]
pub struct ConfigInitialized {
    pub admin: Pubkey,
    pub operator: Pubkey,
    pub usdc_mint: Pubkey,
    pub tickers: u8,
}
