use anchor_lang::prelude::*;

/// The program's errors. Their on-screen words are in ARCHITECTURE.md §6 and USERS.md.
#[error_code]
pub enum MeridianError {
    #[msg("Only the program's upgrade key may initialize the config")]
    NotUpgradeAuthority,
    #[msg("The devnet build refuses mainnet USDC")]
    MainnetUsdcOnDevnet,
    #[msg("A key in the config is missing")]
    MissingKey,
    #[msg("Accepted price programs: one or two, distinct, none missing")]
    InvalidReceivers,
    #[msg("Tickers: one to eight, distinct, 1 to 8 capital letters, a feed ID and a strike step each")]
    InvalidTickers,
    #[msg("The strike ladder must be 1 to 50 percent, in rising order")]
    InvalidLadder,
    #[msg("A threshold is out of range")]
    InvalidThresholds,
}
