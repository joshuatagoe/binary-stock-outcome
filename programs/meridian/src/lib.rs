//! Meridian: binary stock-outcome contracts on Solana devnet (ARCHITECTURE.md §5, §6).
use anchor_lang::prelude::*;

pub mod admin;
pub mod book;
pub mod config;
pub mod errors;
pub mod events;
pub mod lifecycle;
pub mod market;
pub mod pairs;
pub mod place_order;
pub mod settlement;
pub mod token;
pub mod trade_paths;

pub use admin::*;
pub use book::*;
pub use config::*;
pub use lifecycle::*;
pub use market::*;
pub use pairs::*;
pub use place_order::*;
pub use settlement::*;
pub use trade_paths::*;

declare_id!("kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly");

#[program]
pub mod meridian {
    use super::*;

    /// Instruction 1 (ARCHITECTURE.md §6): creates Config, once, signed by the program's upgrade key (AR.03).
    pub fn initialize_config(ctx: Context<InitializeConfig>, args: InitializeConfigArgs) -> Result<()> {
        config::handle_initialize_config(ctx, args)
    }

    /// Instruction 6 (§6): the operator or the admin creates a market, before its open, with its named Yes and No
    /// mints, its vault, its book and the book's token accounts.
    pub fn create_market(ctx: Context<CreateMarket>, args: CreateMarketArgs) -> Result<()> {
        market::handle_create_market(ctx, args)
    }

    /// Instruction 8 (§6): 1.00 USDC into the vault for each pair of Yes and No, while minting is open (D43, D46).
    pub fn mint_pairs(ctx: Context<MintPairs>, quantity: u64) -> Result<()> {
        pairs::handle_mint_pairs(ctx, quantity)
    }

    /// Instruction 9 (§6): pairs back for 1.00 each before the result (D38); winning and losing tokens after it.
    pub fn redeem(ctx: Context<Redeem>, mode: RedeemMode, quantity: u64) -> Result<()> {
        pairs::handle_redeem(ctx, mode, quantity)
    }

    /// Instruction 10 (§6): within the market's order window, matches on its book and moves the taker's tokens.
    pub fn place_order(ctx: Context<PlaceOrder>, args: PlaceOrderArgs) -> Result<()> {
        place_order::handle_place_order(ctx, args)
    }

    /// Instruction 2 (§6): the admin changes thresholds, tickers, receivers, the ladder or the fill limit (D49, M1.01).
    pub fn update_config(ctx: Context<AdminOnly>, args: UpdateConfigArgs) -> Result<()> {
        admin::handle_update_config(ctx, args)
    }

    /// Instruction 3 (§6), first step: the admin proposes a new admin key (D109).
    pub fn propose_admin(ctx: Context<AdminOnly>, new_admin: Pubkey) -> Result<()> {
        admin::handle_propose_admin(ctx, new_admin)
    }

    /// Instruction 3 (§6), second step: the proposed admin accepts.
    pub fn accept_admin(ctx: Context<AcceptAdmin>) -> Result<()> {
        admin::handle_accept_admin(ctx)
    }

    /// Instruction 4 (§6): the admin rotates the operator key (D27).
    pub fn set_operator(ctx: Context<AdminOnly>, operator: Pubkey) -> Result<()> {
        admin::handle_set_operator(ctx, operator)
    }

    /// Instruction 5 (§6): pause stops minting and new orders, nothing else (D68).
    pub fn pause(ctx: Context<AdminOnly>) -> Result<()> {
        admin::handle_pause(ctx)
    }

    pub fn unpause(ctx: Context<AdminOnly>) -> Result<()> {
        admin::handle_unpause(ctx)
    }

    /// Instruction 7 (§6): the admin removes a market before 9:00 (D53, D140).
    pub fn remove_market(ctx: Context<RemoveMarket>) -> Result<()> {
        lifecycle::handle_remove_market(ctx)
    }

    /// Instruction 11 (§6): mints pairs and sells their Yes, keeping the No (D5, D39).
    pub fn buy_no(ctx: Context<NoTrade>, args: BuyNoArgs) -> Result<()> {
        trade_paths::handle_buy_no(ctx, args)
    }

    /// Instruction 12 (§6): buys Yes and closes pairs; never rests (D38).
    pub fn sell_no(ctx: Context<NoTrade>, args: SellNoArgs) -> Result<()> {
        trade_paths::handle_sell_no(ctx, args)
    }

    /// Instruction 13 (§6): the owner cancels a resting order; never paused (D68, D99).
    pub fn cancel_order(ctx: Context<CancelOrder>, order_id: u64) -> Result<()> {
        place_order::handle_cancel_order(ctx, order_id)
    }

    /// Instruction 14 (§6): a maker's batch across books (D111).
    pub fn replace_quotes(ctx: Context<ReplaceQuotes>, books: Vec<BookQuotes>) -> Result<()> {
        trade_paths::handle_replace_quotes(ctx, books)
    }

    /// Instruction 15 (§6): the operator's close sweep (D37).
    pub fn sweep(ctx: Context<Sweep>) -> Result<()> {
        lifecycle::handle_sweep(ctx)
    }

    /// Instruction 16 (§6): anyone pays an owner's book balance to the owner's own accounts (D99).
    pub fn return_to_owner(ctx: Context<ReturnToOwner>) -> Result<()> {
        lifecycle::handle_return_to_owner(ctx)
    }

    /// Instruction 17 (§6): anyone closes a settled, empty book (D50).
    pub fn close_book(ctx: Context<CloseBook>) -> Result<()> {
        lifecycle::handle_close_book(ctx)
    }

    /// Instruction 18 (§6): anyone records or improves a stock's close (D105).
    pub fn record_close(ctx: Context<RecordClose>) -> Result<()> {
        settlement::handle_record_close(ctx)
    }

    /// Instruction 19 (§6): settles from the record, or puts the market under review (D58, D68).
    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        settlement::handle_settle(ctx)
    }

    /// Instruction 20 (§6): the admin holds a market before it settles (D68).
    pub fn hold(ctx: Context<AdminMarket>, note: String) -> Result<()> {
        settlement::handle_hold(ctx, note)
    }

    /// Instruction 21 (§6): the admin proposes a result from the official close (D63, D104).
    pub fn propose_result(ctx: Context<AdminMarket>, official_close_cents: u64, source: String) -> Result<()> {
        settlement::handle_propose_result(ctx, official_close_cents, source)
    }

    /// Instruction 22 (§6).
    pub fn withdraw_proposal(ctx: Context<AdminMarket>) -> Result<()> {
        settlement::handle_withdraw_proposal(ctx)
    }

    /// Instruction 23 (§6): anyone, after the proposal's wait.
    pub fn finalize(ctx: Context<Finalize>) -> Result<()> {
        settlement::handle_finalize(ctx)
    }
}
