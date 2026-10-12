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
    #[msg("Prices are 1 to 99 cents")]
    InvalidPrice,
    #[msg("Quantities must be above 0")]
    InvalidQuantity,
    #[msg("This market's order book is full.")]
    BookFull,
    #[msg("An order with this ID is already resting")]
    DuplicateOrderId,
    #[msg("The fill limit is not set")]
    FillLimitNotSet,
    #[msg("Trading is paused by the admin. You can still cancel orders, close pairs and redeem.")]
    Paused,
    #[msg("The book's token accounts hold less than its orders and balances")]
    BookShort,
    #[msg("An account is passed twice")]
    DuplicateAccount,
    #[msg("Not built yet")]
    NotImplemented,
    #[msg("Not the operator")]
    NotOperator,
    #[msg("This stock isn't enabled in the config")]
    TickerNotEnabled,
    #[msg("The strike must be above zero and a multiple of the stock's step")]
    InvalidStrike,
    #[msg("Minting must open no later than the open, and the open come before orders close")]
    InvalidTimes,
    #[msg("A market must be created before it opens")]
    CreateAfterOpen,
    #[msg("Not open yet")]
    NotOpenYet,
    #[msg("Trading ended before your order reached the network. Nothing was bought; only the network fee was charged.")]
    OrdersClosed,
    #[msg("Pairs can be closed only before the result is final")]
    MarketSettled,
    #[msg("Redeem opens when the result is final.")]
    NotFinal,
    #[msg("The vault holds less than the market owes")]
    VaultShort,
    #[msg("A token's supply is above what the market owes")]
    SupplyOverOwed,
    #[msg("A token account belongs to someone else")]
    NotYourAccount,
}
