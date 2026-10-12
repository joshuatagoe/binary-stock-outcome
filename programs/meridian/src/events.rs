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
