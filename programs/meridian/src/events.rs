use anchor_lang::prelude::*;

/// Instruction 1's event (ARCHITECTURE.md §6).
#[event]
pub struct ConfigInitialized {
    pub admin: Pubkey,
    pub operator: Pubkey,
    pub usdc_mint: Pubkey,
    pub tickers: u8,
}

/// The taker's order traded with one resting order, at that order's price (D42).
#[event]
pub struct Fill {
    pub market: Pubkey,
    pub maker: Pubkey,
    pub maker_order_id: u64,
    pub taker: Pubkey,
    pub taker_order_id: u64,
    /// What the taker did with Yes.
    pub side: crate::book::Side,
    pub price: u8,
    pub quantity: u32,
}

/// A Limit order's remainder now rests on the book.
#[event]
pub struct OrderPlaced {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub order_id: u64,
    pub side: crate::book::Side,
    pub price: u8,
    pub quantity: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum CancelReason {
    Owner,
    /// The owner's own order would have traded with it (D90).
    SelfTrade,
    /// The 4:00 sweep (D37).
    Sweep,
}

/// A resting order left the book; what it locked waits in its owner's book balance (D99).
#[event]
pub struct OrderCancelled {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub order_id: u64,
    /// The resting order's side: a bid buys Yes, an offer sells it.
    pub side: crate::book::Side,
    pub price: u8,
    pub quantity: u32,
    pub reason: CancelReason,
}

/// Writes events exactly as Anchor's `emit_cpi!` does (D62): a call to this program, signed by its event authority,
/// carrying the event tag, the event's discriminator and its fields. It reuses one instruction and one buffer, because
/// `emit_cpi!` allocates several new ones per event and a program's 32 KB heap is never freed during an instruction:
/// with it, a Place order ran out of memory at its 43rd fill (M1.01). Each event is still one call, and a transaction
/// holds at most 64 instructions.
pub struct EventWriter<'info> {
    ix: anchor_lang::solana_program::instruction::Instruction,
    authority: [AccountInfo<'info>; 1],
}

/// Room for the largest event with its two 8-byte tags.
const EVENT_BYTES: usize = 192;

impl<'info> EventWriter<'info> {
    pub fn new(authority: AccountInfo<'info>) -> Self {
        let ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: crate::ID,
            accounts: vec![anchor_lang::solana_program::instruction::AccountMeta::new_readonly(*authority.key, true)],
            data: Vec::with_capacity(EVENT_BYTES),
        };
        Self { ix, authority: [authority] }
    }

    pub fn emit<E: anchor_lang::Event>(&mut self, event: &E) -> Result<()> {
        write_event(&mut self.ix.data, event)?;
        anchor_lang::solana_program::program::invoke_signed(
            &self.ix,
            &self.authority,
            &[&[b"__event_authority", &[crate::EVENT_AUTHORITY_AND_BUMP.1]]],
        )?;
        Ok(())
    }
}

/// An event call's data, the same bytes `emit_cpi!` sends: Anchor's event tag, then the event's own discriminator and
/// fields. Written into `buffer`, which is cleared first.
pub fn write_event<E: anchor_lang::Event>(buffer: &mut Vec<u8>, event: &E) -> Result<()> {
    buffer.clear();
    buffer.extend_from_slice(anchor_lang::event::EVENT_IX_TAG_LE);
    buffer.extend_from_slice(E::DISCRIMINATOR);
    event.serialize(buffer)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_event_carries_the_same_bytes_as_emit_cpi() {
        let fill = Fill {
            market: Pubkey::new_unique(),
            maker: Pubkey::new_unique(),
            maker_order_id: 1,
            taker: Pubkey::new_unique(),
            taker_order_id: 7,
            side: crate::book::Side::Buy,
            price: 65,
            quantity: 10,
        };
        // What emit_cpi! builds (anchor-attribute-event 1.2.0): the tag, then Event::data.
        let anchor: Vec<u8> = anchor_lang::event::EVENT_IX_TAG_LE.iter().copied().chain(anchor_lang::Event::data(&fill)).collect();
        let mut buffer = vec![9; 300];
        write_event(&mut buffer, &fill).unwrap();
        assert_eq!(buffer, anchor);
    }
}

/// A market and its accounts exist (§6, instruction 6).
#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub ticker: String,
    pub day: u32,
    pub strike_cents: u64,
    pub mint_open: i64,
    pub open: i64,
    pub close: i64,
    pub creator: Pubkey,
}

/// `quantity` pairs minted: that many USDC into the vault, that many Yes and No to the owner (§6, instruction 8).
#[event]
pub struct PairsMinted {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub quantity: u64,
}

/// Tokens redeemed or burned, and the USDC paid (§6, instruction 9).
#[event]
pub struct Redeemed {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub mode: crate::pairs::RedeemMode,
    pub quantity: u64,
    pub usdc: u64,
}

/// Config's settings after a change, in full, so the record shows what changed (D70).
#[event]
pub struct ConfigUpdated {
    pub admin: Pubkey,
    pub pyth_receivers: Vec<Pubkey>,
    pub tickers: Vec<crate::Ticker>,
    pub ladder_bps: [u16; 3],
    pub thresholds: crate::Thresholds,
    pub fill_limit: u16,
}

#[event]
pub struct AdminProposed {
    pub admin: Pubkey,
    pub proposed: Pubkey,
}

#[event]
pub struct AdminAccepted {
    pub previous: Pubkey,
    pub admin: Pubkey,
}

#[event]
pub struct OperatorChanged {
    pub previous: Pubkey,
    pub operator: Pubkey,
}

#[event]
pub struct Paused {
    pub admin: Pubkey,
}

#[event]
pub struct Unpaused {
    pub admin: Pubkey,
}

#[event]
pub struct MarketRemoved {
    pub market: Pubkey,
}

/// An owner's balance in the book paid to its own accounts (D99).
#[event]
pub struct BalanceReturned {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub usdc: u64,
    pub yes: u64,
}

#[event]
pub struct BookClosed {
    pub market: Pubkey,
}

/// A stock's close recorded or improved (D105).
#[event]
pub struct CloseRecorded {
    pub ticker: String,
    pub day: u32,
    pub price: i64,
    pub conf: u64,
    pub expo: i32,
    pub publish_time: i64,
    pub price_account: Pubkey,
    pub recorder: Pubkey,
}

#[event]
pub struct MarketSettled {
    pub market: Pubkey,
    pub outcome: crate::market::Outcome,
    pub settled_by: crate::market::SettledBy,
    pub price: i64,
    pub conf: u64,
    pub expo: i32,
    pub publish_time: i64,
}

#[event]
pub struct MarketHeld {
    pub market: Pubkey,
    pub reason: crate::market::HoldReason,
    /// The admin's public note on an admin hold (D70, D91); empty otherwise.
    pub note: String,
}

#[event]
pub struct ResultProposed {
    pub market: Pubkey,
    pub outcome: crate::market::Outcome,
    pub official_close_cents: u64,
    /// Where the official close came from, kept here because a re-proposal overwrites the market's copy.
    pub source: String,
    pub final_at: i64,
}

#[event]
pub struct ProposalWithdrawn {
    pub market: Pubkey,
}
