//! Meridian: binary stock-outcome contracts on Solana devnet (ARCHITECTURE.md §5, §6).
use anchor_lang::prelude::*;

pub mod config;
pub mod errors;
pub mod events;

pub use config::*;

declare_id!("kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly");

#[program]
pub mod meridian {
    use super::*;

    /// Instruction 1 (ARCHITECTURE.md §6): creates Config, once, signed by the program's upgrade key (AR.03).
    pub fn initialize_config(ctx: Context<InitializeConfig>, args: InitializeConfigArgs) -> Result<()> {
        config::handle_initialize_config(ctx, args)
    }
}
