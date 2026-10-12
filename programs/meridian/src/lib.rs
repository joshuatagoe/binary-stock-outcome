//! Meridian: binary stock-outcome contracts on Solana devnet (ARCHITECTURE.md §5, §6).
use anchor_lang::prelude::*;

pub mod book;
pub mod config;
pub mod errors;
pub mod events;
pub mod place_order;
pub mod token;

pub use book::*;
pub use config::*;
pub use place_order::*;

declare_id!("kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly");

#[program]
pub mod meridian {
    use super::*;

    /// Instruction 1 (ARCHITECTURE.md §6): creates Config, once, signed by the program's upgrade key (AR.03).
    pub fn initialize_config(ctx: Context<InitializeConfig>, args: InitializeConfigArgs) -> Result<()> {
        config::handle_initialize_config(ctx, args)
    }

    /// Instruction 10 (§6), in M1-a's form for the order-book spike (D21): matches on the book and moves the taker's
    /// tokens; the market's window and the full checks arrive in M1-c.
    pub fn place_order(ctx: Context<PlaceOrder>, args: PlaceOrderArgs) -> Result<()> {
        place_order::handle_place_order(ctx, args)
    }
}
