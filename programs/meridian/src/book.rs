//! The order book (ARCHITECTURE.md §3, §5; D107): 64 resting orders a side and 64 traders in one zero-copy account,
//! and the matching rules: best price first, then oldest; at the resting order's price (D42); never beyond the taker's
//! worst price (D15); a self-trade cancels the resting order and matching continues (D90); an owner's order IDs are
//! unique among their resting orders (D101). The taker's side never enters the book: Place order, Buy No and Sell No
//! move it straight to and from the taker's wallet, while makers are credited inside the book until they're returned
//! (D99). A Buy No limit order's unsold pairs rest as a paired offer, their No held in the book (D142).
use anchor_lang::prelude::*;

use crate::{errors::MeridianError, market::USDC_PER_PAIR};

pub const BOOK_SEED: &[u8] = b"book";
pub const BOOK_USDC_SEED: &[u8] = b"book_usdc";
pub const BOOK_YES_SEED: &[u8] = b"book_yes";
pub const BOOK_NO_SEED: &[u8] = b"book_no";
/// An order's flag: a Buy No limit order's unsold pairs (D39, D142). Its Yes rest as the offer and its No wait in the
/// book's No account, so a cancel or the sweep can close the pairs without the owner's signature.
pub const PAIRED: u8 = 1;
pub const SIDE_CAPACITY: usize = 64;
pub const TRADER_CAPACITY: usize = 64;
/// USDC has 6 decimals, so one cent is 10,000 of its smallest units.
pub const USDC_PER_CENT: u64 = 10_000;

#[account(zero_copy)]
#[repr(C)]
pub struct Book {
    pub market: Pubkey,
    /// The next order's sequence number, for time priority.
    pub next_seq: u64,
    pub bid_count: u8,
    pub ask_count: u8,
    pub bump: u8,
    pub book_usdc_bump: u8,
    pub book_yes_bump: u8,
    pub book_no_bump: u8,
    pub _reserved: [u8; 18],
    /// Highest price first, then oldest.
    pub bids: [Order; SIDE_CAPACITY],
    /// Lowest price first, then oldest.
    pub asks: [Order; SIDE_CAPACITY],
    pub traders: [Trader; TRADER_CAPACITY],
}

/// A resting order (24 bytes): a bid locks price × quantity in USDC, an offer locks quantity in Yes, and a paired
/// offer's No wait in the book's No account (D142).
#[zero_copy]
#[derive(Debug, PartialEq, Eq)]
pub struct Order {
    pub seq: u64,
    /// The ID its sender chose (D101).
    pub order_id: u64,
    pub quantity: u32,
    /// The owner's index in the trader table.
    pub trader: u8,
    /// In cents, 1 to 99.
    pub price: u8,
    /// PAIRED, or 0.
    pub flags: u8,
    pub _pad: u8,
}

/// A trader with resting orders or free balances (64 bytes). Reused once its three balances (USDC, Yes, No) are zero
/// and it has no open orders (D107, D142).
#[zero_copy]
#[derive(Debug, PartialEq, Eq)]
pub struct Trader {
    pub owner: Pubkey,
    /// USDC credited by fills and cancels, waiting for Return to owner (D99), in its smallest units.
    pub free_usdc: u64,
    pub free_yes: u64,
    /// No released from the owner's paired offers as they sell (D142).
    pub free_no: u64,
    pub open_orders: u16,
    pub _pad: [u8; 6],
}

/// What the order does with Yes. Buy No sells Yes and Sell No buys it (D5, D38).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Side {
    Buy,
    Sell,
}

impl Side {
    pub fn opposite(self) -> Side {
        match self {
            Side::Buy => Side::Sell,
            Side::Sell => Side::Buy,
        }
    }
}

/// A Market order fills what it can now and the rest is not placed; a Limit order's rest rests at its price (§3).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum OrderKind {
    Market,
    Limit,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct PlaceOrderArgs {
    pub side: Side,
    pub kind: OrderKind,
    /// A Limit order's price, or a Market order's worst price (D15), in cents.
    pub price: u8,
    pub quantity: u32,
    pub order_id: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Fill {
    pub maker: Pubkey,
    pub maker_order_id: u64,
    pub price: u8,
    pub quantity: u32,
}

/// A resting order cancelled because the taker's own order would have traded with it (D90).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SelfTrade {
    pub order_id: u64,
    pub price: u8,
    pub quantity: u32,
}

/// A resting order the taker's order reached, in the order reached, so its events come out in that order.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Match {
    Fill(Fill),
    SelfTrade(SelfTrade),
}

/// What one order did, and what Place order must move between the taker's wallet and the book.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Placement {
    pub matches: Vec<Match>,
    /// Yes the taker bought or sold.
    pub filled: u32,
    /// USDC the taker paid for its fills (Buy) or received from them (Sell).
    pub fill_usdc: u64,
    /// What the taker's own cancelled orders locked, returned straight to its wallet in this transaction (D90): Yes
    /// from its offers when it buys, USDC from its bids when it sells.
    pub returned: u64,
    /// The remainder now resting, at the order's price.
    pub rested: u32,
    /// The order stopped at the fill limit; anything left is not placed (§3).
    pub stopped_at_fill_limit: bool,
}

impl Placement {
    pub fn fills(&self) -> Vec<Fill> {
        self.matches.iter().filter_map(|m| if let Match::Fill(f) = m { Some(*f) } else { None }).collect()
    }

    pub fn self_trades(&self) -> Vec<SelfTrade> {
        self.matches.iter().filter_map(|m| if let Match::SelfTrade(s) = m { Some(*s) } else { None }).collect()
    }

    /// USDC from the taker's wallet into the book: what its fills cost, and the lock for a resting bid.
    pub fn usdc_in(&self, args: &PlaceOrderArgs) -> u64 {
        match args.side {
            Side::Buy => self.fill_usdc + self.rested as u64 * args.price as u64 * USDC_PER_CENT,
            Side::Sell => 0,
        }
    }

    /// USDC from the book to the taker's wallet: a seller's proceeds, and its own cancelled bids' USDC.
    pub fn usdc_out(&self, args: &PlaceOrderArgs) -> u64 {
        match args.side {
            Side::Buy => 0,
            Side::Sell => self.fill_usdc + self.returned,
        }
    }

    /// Yes from the taker's wallet into the book: what it sold, and the lock for a resting offer.
    pub fn yes_in(&self, args: &PlaceOrderArgs) -> u64 {
        match args.side {
            Side::Buy => 0,
            Side::Sell => self.filled as u64 + self.rested as u64,
        }
    }

    /// Yes from the book to the taker's wallet: what it bought, and its own cancelled offers' Yes.
    pub fn yes_out(&self, args: &PlaceOrderArgs) -> u64 {
        match args.side {
            Side::Buy => self.filled as u64 + self.returned,
            Side::Sell => 0,
        }
    }
}

impl Book {
    pub fn init(&mut self, market: Pubkey, bump: u8, book_usdc_bump: u8, book_yes_bump: u8, book_no_bump: u8) {
        self.market = market;
        self.bump = bump;
        self.book_usdc_bump = book_usdc_bump;
        self.book_yes_bump = book_yes_bump;
        self.book_no_bump = book_no_bump;
    }

    pub fn bids(&self) -> &[Order] {
        &self.bids[..self.bid_count as usize]
    }

    pub fn asks(&self) -> &[Order] {
        &self.asks[..self.ask_count as usize]
    }

    pub fn trader(&self, owner: &Pubkey) -> Option<&Trader> {
        self.traders.iter().find(|t| t.owner == *owner)
    }

    /// Matches an order from `owner`, then rests a Limit order's remainder (§3). At most `fill_limit` resting orders
    /// are reached, counting both fills and self-trade cancels, since each costs about the same compute (D21). An
    /// order stopped by the limit places nothing more, so the book never rests a bid at or above its best offer.
    /// A remainder that can't rest, because its side or the trader table is full, refuses the whole order (D107).
    /// On an error the book may already be changed, so the instruction must fail with it, which rolls everything back.
    pub fn place(&mut self, owner: &Pubkey, args: &PlaceOrderArgs, fill_limit: u16) -> Result<Placement> {
        self.place_flagged(owner, args, fill_limit, 0)
    }

    /// Buy No on the book (D5, D142): the Yes of the pairs it mints are sold into the bids, as a sell of Yes at no less
    /// than `args.price`, and a Limit order's remainder rests as a paired offer. The pairs to mint are what it filled
    /// plus what rests. Otherwise as `place`.
    pub fn place_paired(&mut self, owner: &Pubkey, args: &PlaceOrderArgs, fill_limit: u16) -> Result<Placement> {
        self.place_flagged(owner, &PlaceOrderArgs { side: Side::Sell, ..*args }, fill_limit, PAIRED)
    }

    /// Sell No on the book (D38): a Market order that never rests and has no order ID of its own, so the owner's
    /// resting IDs aren't checked. Otherwise as `place`.
    pub fn take(&mut self, owner: &Pubkey, side: Side, price: u8, quantity: u32, fill_limit: u16) -> Result<Placement> {
        let args = PlaceOrderArgs { side, kind: OrderKind::Market, price, quantity, order_id: 0 };
        Self::check_order(&args, fill_limit)?;
        Ok(self.match_orders(owner, &args, fill_limit))
    }

    fn check_order(args: &PlaceOrderArgs, fill_limit: u16) -> Result<()> {
        require!((1..=99).contains(&args.price), MeridianError::InvalidPrice);
        require!(args.quantity > 0, MeridianError::InvalidQuantity);
        require!(fill_limit > 0, MeridianError::FillLimitNotSet);
        Ok(())
    }

    /// Matches, then rests a Limit order's remainder with `flags`.
    fn place_flagged(&mut self, owner: &Pubkey, args: &PlaceOrderArgs, fill_limit: u16, flags: u8) -> Result<Placement> {
        Self::check_order(args, fill_limit)?;
        if let Some(t) = self.trader_index(owner) {
            let resting = self.bids().iter().chain(self.asks().iter());
            require!(
                !resting.into_iter().any(|o| o.trader as usize == t && o.order_id == args.order_id),
                MeridianError::DuplicateOrderId
            );
        }
        let mut p = self.match_orders(owner, args, fill_limit);
        let remaining = args.quantity - p.filled;
        if remaining > 0 && args.kind == OrderKind::Limit && !p.stopped_at_fill_limit {
            self.rest(owner, args, remaining, flags)?;
            p.rested = remaining;
        }
        Ok(p)
    }

    /// The matching itself (§3), with nothing rested.
    fn match_orders(&mut self, owner: &Pubkey, args: &PlaceOrderArgs, fill_limit: u16) -> Placement {
        let mut p = Placement::default();
        let mut remaining = args.quantity;
        let mut taken = 0; // resting orders used up, all at the front of the side
        let (count, crosses): (usize, fn(u8, u8) -> bool) = match args.side {
            Side::Buy => (self.ask_count as usize, |resting, limit| resting <= limit),
            Side::Sell => (self.bid_count as usize, |resting, limit| resting >= limit),
        };
        while taken < count && remaining > 0 {
            let o = match args.side {
                Side::Buy => self.asks[taken],
                Side::Sell => self.bids[taken],
            };
            if !crosses(o.price, args.price) {
                break;
            }
            if p.matches.len() as u16 == fill_limit {
                p.stopped_at_fill_limit = true;
                break;
            }
            let maker = &mut self.traders[o.trader as usize];
            if maker.owner == *owner {
                if o.flags & PAIRED != 0 {
                    // A paired offer's Yes and No stay together, in the owner's balance in the book (D142).
                    maker.free_yes += o.quantity as u64;
                    maker.free_no += o.quantity as u64;
                } else {
                    // D90: what the resting order locked goes back to its owner's wallet, which this order's
                    // transaction already lists.
                    p.returned += match args.side {
                        Side::Buy => o.quantity as u64,
                        Side::Sell => o.quantity as u64 * o.price as u64 * USDC_PER_CENT,
                    };
                }
                maker.open_orders -= 1;
                p.matches.push(Match::SelfTrade(SelfTrade { order_id: o.order_id, price: o.price, quantity: o.quantity }));
                taken += 1;
                continue;
            }
            let q = remaining.min(o.quantity);
            let usdc = q as u64 * o.price as u64 * USDC_PER_CENT;
            match args.side {
                Side::Buy => maker.free_usdc += usdc,
                Side::Sell => maker.free_yes += q as u64,
            }
            if o.flags & PAIRED != 0 {
                // A paired offer's sold Yes release their No to the owner (D142).
                maker.free_no += q as u64;
            }
            p.matches.push(Match::Fill(Fill { maker: maker.owner, maker_order_id: o.order_id, price: o.price, quantity: q }));
            p.fill_usdc += usdc;
            p.filled += q;
            remaining -= q;
            if q == o.quantity {
                maker.open_orders -= 1;
                taken += 1;
            } else {
                match args.side {
                    Side::Buy => self.asks[taken].quantity -= q,
                    Side::Sell => self.bids[taken].quantity -= q,
                }
            }
        }
        match args.side {
            Side::Buy => {
                self.asks.copy_within(taken..count, 0);
                self.ask_count -= taken as u8;
            }
            Side::Sell => {
                self.bids.copy_within(taken..count, 0);
                self.bid_count -= taken as u8;
            }
        }
        p
    }

    /// Adds a resting order behind every order at the same or a better price, for time priority.
    fn rest(&mut self, owner: &Pubkey, args: &PlaceOrderArgs, quantity: u32, flags: u8) -> Result<()> {
        let side_count = match args.side {
            Side::Buy => self.bid_count,
            Side::Sell => self.ask_count,
        } as usize;
        require!(side_count < SIDE_CAPACITY, MeridianError::BookFull);
        let trader = match self.trader_index(owner).or_else(|| self.free_trader_index()) {
            Some(t) => t,
            None => return err!(MeridianError::BookFull),
        };
        let entry = &mut self.traders[trader];
        entry.owner = *owner;
        entry.open_orders += 1;
        let order = Order {
            seq: self.next_seq,
            order_id: args.order_id,
            quantity,
            trader: trader as u8,
            price: args.price,
            flags,
            _pad: 0,
        };
        self.next_seq += 1;
        let (orders, behind): (&mut [Order], fn(u8, u8) -> bool) = match args.side {
            Side::Buy => (&mut self.bids[..], |resting, new| resting >= new),
            Side::Sell => (&mut self.asks[..], |resting, new| resting <= new),
        };
        let at = orders[..side_count].iter().position(|o| !behind(o.price, order.price)).unwrap_or(side_count);
        orders.copy_within(at..side_count, at + 1);
        orders[at] = order;
        match args.side {
            Side::Buy => self.bid_count += 1,
            Side::Sell => self.ask_count += 1,
        }
        Ok(())
    }

    /// Takes an owner's resting order off the book and credits what it locked to the owner's balance (D99): a bid's
    /// USDC or an offer's Yes. A paired offer's pairs are closed instead, 1.00 each (D39, D142). Returns the order's
    /// side, as what it does with Yes, its price, its quantity, and whether it was a paired offer: then the caller must
    /// burn that many Yes and No in the book and move 1.00 each from the vault to the book's USDC.
    pub fn cancel(&mut self, owner: &Pubkey, order_id: u64) -> Result<(Side, u8, u32, bool)> {
        let trader = self.trader_index(owner).ok_or(MeridianError::OrderNotFound)?;
        for side in [Side::Buy, Side::Sell] {
            let (orders, count) = match side {
                Side::Buy => (&mut self.bids, self.bid_count as usize),
                Side::Sell => (&mut self.asks, self.ask_count as usize),
            };
            let Some(at) = orders[..count].iter().position(|o| o.trader as usize == trader && o.order_id == order_id) else {
                continue;
            };
            let o = orders[at];
            let paired = o.flags & PAIRED != 0;
            orders.copy_within(at + 1..count, at);
            let entry = &mut self.traders[trader];
            match side {
                Side::Buy => {
                    self.bid_count -= 1;
                    entry.free_usdc += o.quantity as u64 * o.price as u64 * USDC_PER_CENT;
                }
                Side::Sell => {
                    self.ask_count -= 1;
                    if paired {
                        entry.free_usdc += o.quantity as u64 * USDC_PER_PAIR;
                    } else {
                        entry.free_yes += o.quantity as u64;
                    }
                }
            }
            entry.open_orders -= 1;
            return Ok((side, o.price, o.quantity, paired));
        }
        err!(MeridianError::OrderNotFound)
    }

    fn trader_index(&self, owner: &Pubkey) -> Option<usize> {
        self.traders.iter().position(|t| t.owner == *owner)
    }

    /// An entry never used, or one with no balances, No included (D142), and no open orders (D107).
    fn free_trader_index(&self) -> Option<usize> {
        self.traders.iter().position(|t| {
            t.owner == Pubkey::default() || (t.free_usdc == 0 && t.free_yes == 0 && t.free_no == 0 && t.open_orders == 0)
        })
    }

    /// USDC locked by resting bids.
    pub fn locked_usdc(&self) -> u64 {
        self.bids().iter().map(|o| o.quantity as u64 * o.price as u64 * USDC_PER_CENT).sum()
    }

    /// Yes locked by resting offers.
    pub fn locked_yes(&self) -> u64 {
        self.asks().iter().map(|o| o.quantity as u64).sum()
    }

    pub fn free_usdc(&self) -> u64 {
        self.traders.iter().map(|t| t.free_usdc).sum()
    }

    /// No waiting in the book with paired offers (D142).
    pub fn locked_no(&self) -> u64 {
        self.asks().iter().filter(|o| o.flags & PAIRED != 0).map(|o| o.quantity as u64).sum()
    }

    pub fn free_no(&self) -> u64 {
        self.traders.iter().map(|t| t.free_no).sum()
    }

    pub fn free_yes(&self) -> u64 {
        self.traders.iter().map(|t| t.free_yes).sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::Discriminator;

    const MARKET_BOOK_BYTES: usize = 7_240;

    fn book() -> Box<Book> {
        let mut b: Box<Book> = Box::new(bytemuck::Zeroable::zeroed());
        b.init(Pubkey::new_unique(), 255, 254, 253, 252);
        b
    }

    fn buy(kind: OrderKind, price: u8, quantity: u32, order_id: u64) -> PlaceOrderArgs {
        PlaceOrderArgs { side: Side::Buy, kind, price, quantity, order_id }
    }

    fn sell(kind: OrderKind, price: u8, quantity: u32, order_id: u64) -> PlaceOrderArgs {
        PlaceOrderArgs { side: Side::Sell, kind, price, quantity, order_id }
    }

    fn levels(orders: &[Order]) -> Vec<(u8, u32)> {
        orders.iter().map(|o| (o.price, o.quantity)).collect()
    }

    fn cents(c: u64) -> u64 {
        c * USDC_PER_CENT
    }

    /// The META $680 book at 10:16 (ARCHITECTURE.md §5): asks 65¢ × 10 (Dave) and 66¢ × 5 (bot); bids 64¢ × 5 (bot)
    /// and 60¢ × 10 (Carol).
    struct TenSixteen {
        book: Box<Book>,
        dave: Pubkey,
        bot: Pubkey,
        carol: Pubkey,
    }

    fn ten_sixteen() -> TenSixteen {
        let mut book = book();
        let (dave, bot, carol) = (Pubkey::new_unique(), Pubkey::new_unique(), Pubkey::new_unique());
        book.place(&bot, &sell(OrderKind::Limit, 66, 5, 1), 10).unwrap();
        book.place(&bot, &buy(OrderKind::Limit, 64, 5, 2), 10).unwrap();
        book.place(&carol, &buy(OrderKind::Limit, 60, 10, 1), 10).unwrap();
        book.place(&dave, &sell(OrderKind::Limit, 65, 10, 1), 10).unwrap();
        TenSixteen { book, dave, bot, carol }
    }

    #[test]
    fn the_book_is_7240_bytes_with_24_byte_orders_and_64_byte_traders() {
        assert_eq!(std::mem::size_of::<Order>(), 24);
        assert_eq!(std::mem::size_of::<Trader>(), 64);
        assert_eq!(Book::DISCRIMINATOR.len() + std::mem::size_of::<Book>(), MARKET_BOOK_BYTES);
    }

    #[test]
    fn resting_orders_sort_by_best_price_then_oldest() {
        let mut b = book();
        let (a, c) = (Pubkey::new_unique(), Pubkey::new_unique());
        b.place(&a, &buy(OrderKind::Limit, 60, 1, 1), 10).unwrap();
        b.place(&a, &buy(OrderKind::Limit, 64, 2, 2), 10).unwrap();
        b.place(&c, &buy(OrderKind::Limit, 64, 3, 1), 10).unwrap();
        b.place(&a, &sell(OrderKind::Limit, 70, 4, 3), 10).unwrap();
        b.place(&c, &sell(OrderKind::Limit, 66, 5, 2), 10).unwrap();
        b.place(&a, &sell(OrderKind::Limit, 66, 6, 4), 10).unwrap();
        assert_eq!(levels(b.bids()), vec![(64, 2), (64, 3), (60, 1)]);
        assert_eq!(levels(b.asks()), vec![(66, 5), (66, 6), (70, 4)]);
        assert!(b.bids()[0].seq < b.bids()[1].seq);
    }

    #[test]
    fn alice_buys_daves_10_yes_at_65_cents() {
        let TenSixteen { mut book, dave, .. } = ten_sixteen();
        let alice = Pubkey::new_unique();
        let args = buy(OrderKind::Market, 66, 10, 7);
        let p = book.place(&alice, &args, 10).unwrap();
        assert_eq!(p.fills(), vec![Fill { maker: dave, maker_order_id: 1, price: 65, quantity: 10 }]);
        assert_eq!((p.filled, p.usdc_in(&args), p.yes_out(&args)), (10, cents(650), 10));
        assert_eq!(book.trader(&dave).unwrap().free_usdc, cents(650));
        assert_eq!(levels(book.asks()), vec![(66, 5)]);
        assert!(book.trader(&alice).is_none(), "a taker never enters the trader table");
    }

    #[test]
    fn a_trade_happens_at_the_resting_price_and_the_taker_keeps_the_improvement() {
        let TenSixteen { mut book, .. } = ten_sixteen();
        let args = buy(OrderKind::Market, 70, 10, 7);
        let p = book.place(&Pubkey::new_unique(), &args, 10).unwrap();
        assert_eq!(p.usdc_in(&args), cents(650), "D42: 10 at 65¢, not 70¢");
    }

    #[test]
    fn matching_stops_at_the_worst_price_and_a_market_remainder_is_not_placed() {
        let TenSixteen { mut book, .. } = ten_sixteen();
        let args = buy(OrderKind::Market, 65, 15, 7);
        let p = book.place(&Pubkey::new_unique(), &args, 10).unwrap();
        assert_eq!((p.filled, p.rested), (10, 0));
        assert_eq!(levels(book.asks()), vec![(66, 5)]);
        assert_eq!(levels(book.bids()), vec![(64, 5), (60, 10)]);
    }

    #[test]
    fn best_price_first_then_oldest_and_a_partly_filled_order_keeps_its_place() {
        let TenSixteen { mut book, dave, .. } = ten_sixteen();
        let eve = Pubkey::new_unique();
        book.place(&eve, &sell(OrderKind::Limit, 65, 3, 1), 10).unwrap();
        let p = book.place(&Pubkey::new_unique(), &buy(OrderKind::Market, 66, 12, 7), 10).unwrap();
        let makers: Vec<_> = p.fills().iter().map(|f| (f.maker, f.price, f.quantity)).collect();
        assert_eq!(makers, vec![(dave, 65, 10), (eve, 65, 2)]);
        assert_eq!(levels(book.asks()), vec![(65, 1), (66, 5)]);
        assert_eq!(book.traders[book.asks()[0].trader as usize].owner, eve);
    }

    #[test]
    fn a_seller_is_paid_from_the_bids_lock_and_the_bidder_is_credited_yes() {
        let TenSixteen { mut book, bot, carol, .. } = ten_sixteen();
        let args = sell(OrderKind::Market, 60, 10, 7);
        let p = book.place(&Pubkey::new_unique(), &args, 10).unwrap();
        assert_eq!((p.filled, p.usdc_out(&args), p.yes_in(&args)), (10, cents(5 * 64 + 5 * 60), 10));
        assert_eq!(book.trader(&bot).unwrap().free_yes, 5);
        assert_eq!(book.trader(&carol).unwrap().free_yes, 5);
        assert_eq!(levels(book.bids()), vec![(60, 5)]);
    }

    #[test]
    fn a_limit_remainder_rests_at_its_price_and_locks_what_it_offers() {
        let TenSixteen { mut book, .. } = ten_sixteen();
        let frank = Pubkey::new_unique();
        let args = buy(OrderKind::Limit, 65, 12, 9);
        let p = book.place(&frank, &args, 10).unwrap();
        assert_eq!((p.filled, p.rested), (10, 2));
        assert_eq!(p.usdc_in(&args), cents(650 + 2 * 65));
        assert_eq!(levels(book.bids()), vec![(65, 2), (64, 5), (60, 10)]);
        assert_eq!(book.trader(&frank).unwrap().open_orders, 1);
    }

    #[test]
    fn a_self_trade_cancels_the_resting_order_and_matching_continues() {
        // D90's example: Dave's Buy Yes of 5 at up to 66¢ cancels his own offer and buys from the bot for 3.30.
        let TenSixteen { mut book, dave, bot, .. } = ten_sixteen();
        let args = buy(OrderKind::Market, 66, 5, 8);
        let p = book.place(&dave, &args, 10).unwrap();
        assert_eq!(
            p.matches,
            vec![
                Match::SelfTrade(SelfTrade { order_id: 1, price: 65, quantity: 10 }),
                Match::Fill(Fill { maker: bot, maker_order_id: 1, price: 66, quantity: 5 }),
            ],
            "in the order reached"
        );
        assert_eq!(p.usdc_in(&args), cents(330));
        assert_eq!(p.yes_out(&args), 5 + 10, "the 5 bought, and the cancelled offer's 10 back to Dave's wallet");
        assert_eq!(book.trader(&dave).unwrap().free_yes, 0, "nothing waits in the book");
        assert_eq!(book.trader(&dave).unwrap().open_orders, 0);
        assert!(book.asks().is_empty());
        assert_eq!((book.locked_yes(), book.free_yes()), (0, 0));
    }

    #[test]
    fn a_sellers_own_bid_is_cancelled_and_its_usdc_returned_to_its_wallet() {
        // Carol sells 7 at no less than 60¢: the bot's 5 at 64¢ fill, then her own bid of 10 at 60¢ is cancelled.
        let TenSixteen { mut book, bot, carol, .. } = ten_sixteen();
        let args = sell(OrderKind::Market, 60, 7, 8);
        let p = book.place(&carol, &args, 10).unwrap();
        assert_eq!(
            p.matches,
            vec![
                Match::Fill(Fill { maker: bot, maker_order_id: 2, price: 64, quantity: 5 }),
                Match::SelfTrade(SelfTrade { order_id: 1, price: 60, quantity: 10 }),
            ]
        );
        assert_eq!((p.filled, p.rested), (5, 0), "a Market order's last 2 are not placed");
        assert_eq!(p.usdc_out(&args), cents(5 * 64 + 10 * 60), "3.20 for the 5 sold, and the bid's 6.00 back");
        assert_eq!(p.yes_in(&args), 5);
        assert_eq!(book.trader(&carol).unwrap().free_usdc, 0);
        assert!(book.bids().is_empty());
    }

    #[test]
    fn an_owner_cannot_reuse_a_resting_orders_id_but_another_owner_can() {
        let TenSixteen { mut book, carol, .. } = ten_sixteen();
        let again = book.place(&carol, &buy(OrderKind::Limit, 55, 1, 1), 10);
        assert_eq!(again.unwrap_err(), MeridianError::DuplicateOrderId.into());
        book.place(&Pubkey::new_unique(), &buy(OrderKind::Limit, 55, 1, 1), 10).unwrap();
    }

    #[test]
    fn prices_must_be_1_to_99_cents_and_quantities_above_0() {
        let mut b = book();
        let o = Pubkey::new_unique();
        for price in [0, 100] {
            assert_eq!(b.place(&o, &buy(OrderKind::Limit, price, 1, 1), 10).unwrap_err(), MeridianError::InvalidPrice.into());
        }
        assert_eq!(b.place(&o, &buy(OrderKind::Limit, 50, 0, 1), 10).unwrap_err(), MeridianError::InvalidQuantity.into());
        assert_eq!(b.place(&o, &buy(OrderKind::Limit, 50, 1, 1), 0).unwrap_err(), MeridianError::FillLimitNotSet.into());
    }

    #[test]
    fn a_full_side_refuses_a_resting_order_but_a_market_order_still_trades() {
        let mut b = book();
        let maker = Pubkey::new_unique();
        for i in 0..SIDE_CAPACITY as u64 {
            b.place(&maker, &sell(OrderKind::Limit, 70, 1, i), 10).unwrap();
        }
        let refused = b.place(&Pubkey::new_unique(), &sell(OrderKind::Limit, 71, 1, 1), 10);
        assert_eq!(refused.unwrap_err(), MeridianError::BookFull.into());
        let p = b.place(&Pubkey::new_unique(), &buy(OrderKind::Market, 70, 3, 1), 10).unwrap();
        assert_eq!(p.filled, 3);
    }

    #[test]
    fn a_full_trader_table_refuses_a_new_traders_resting_order() {
        let mut b = book();
        for i in 0..TRADER_CAPACITY as u8 {
            b.place(&Pubkey::new_unique(), &buy(OrderKind::Limit, 1 + i % 50, 1, 1), 10).unwrap();
        }
        let refused = b.place(&Pubkey::new_unique(), &sell(OrderKind::Limit, 90, 1, 1), 10);
        assert_eq!(refused.unwrap_err(), MeridianError::BookFull.into());
    }

    #[test]
    fn an_empty_trader_entry_is_reused() {
        let mut b = book();
        let makers: Vec<Pubkey> = (0..TRADER_CAPACITY).map(|_| Pubkey::new_unique()).collect();
        for (i, maker) in makers.iter().enumerate() {
            b.place(maker, &sell(OrderKind::Limit, 10 + i as u8, 1, 1), 10).unwrap();
        }
        // The cheapest offer is bought, which leaves its maker no orders and 0.10 USDC in the book; Return to owner
        // (M1-c) then pays that out, which this test does by hand.
        b.place(&Pubkey::new_unique(), &buy(OrderKind::Market, 10, 1, 1), 10).unwrap();
        let index = b.traders.iter().position(|t| t.owner == makers[0]).unwrap();
        assert_eq!((b.traders[index].free_usdc, b.traders[index].open_orders), (cents(10), 0));
        b.traders[index].free_usdc = 0;
        let newcomer = Pubkey::new_unique();
        b.place(&newcomer, &buy(OrderKind::Limit, 5, 1, 1), 10).unwrap();
        assert_eq!(b.traders[index].owner, newcomer);
    }

    #[test]
    fn the_fill_limit_stops_the_order_and_its_rest_is_not_placed() {
        let mut b = book();
        for i in 0..5 {
            b.place(&Pubkey::new_unique(), &sell(OrderKind::Limit, 60 + i, 1, 1), 10).unwrap();
        }
        let p = b.place(&Pubkey::new_unique(), &buy(OrderKind::Limit, 99, 5, 1), 3).unwrap();
        assert_eq!((p.filled, p.rested, p.stopped_at_fill_limit), (3, 0, true));
        assert_eq!(levels(b.asks()), vec![(63, 1), (64, 1)], "nothing rests across the remaining offers");
        assert!(b.bids().is_empty());
    }

    #[test]
    fn self_trade_cancels_count_toward_the_fill_limit() {
        let mut b = book();
        let dave = Pubkey::new_unique();
        b.place(&dave, &sell(OrderKind::Limit, 60, 1, 1), 10).unwrap();
        b.place(&dave, &sell(OrderKind::Limit, 61, 1, 2), 10).unwrap();
        b.place(&Pubkey::new_unique(), &sell(OrderKind::Limit, 62, 1, 1), 10).unwrap();
        let p = b.place(&dave, &buy(OrderKind::Market, 99, 1, 3), 2).unwrap();
        assert_eq!((p.self_trades().len(), p.filled, p.stopped_at_fill_limit), (2, 0, true));
    }

    #[test]
    fn a_paired_offers_sold_yes_release_their_no_to_the_owner() {
        // D142: Bob's Buy No limit left 6 pairs unsold: 6 Yes offered at 67¢, their 6 No in the book.
        let mut b = book();
        let bob = Pubkey::new_unique();
        b.place(&bob, &sell(OrderKind::Limit, 67, 6, 1), 10).unwrap();
        b.asks[0].flags = PAIRED;
        assert_eq!(b.locked_no(), 6);
        let alice = Pubkey::new_unique();
        let p = b.place(&alice, &buy(OrderKind::Market, 67, 4, 1), 10).unwrap();
        assert_eq!(p.filled, 4);
        assert_eq!((b.trader(&bob).unwrap().free_usdc, b.trader(&bob).unwrap().free_no), (cents(4 * 67), 4));
        assert_eq!((b.locked_no(), b.locked_no() + b.free_no()), (2, 6), "the No only move inside the book");
        assert_eq!(b.asks()[0].flags, PAIRED);
        // Cancelling closes the 2 unsold pairs, 1.00 each to Bob's balance; the instruction burns their tokens.
        assert_eq!(b.cancel(&bob, 1).unwrap(), (Side::Sell, 67, 2, true), "a paired offer's pairs close");
        let entry = b.trader(&bob).unwrap();
        assert_eq!((entry.free_usdc, entry.free_yes, entry.free_no), (cents(4 * 67) + 2 * USDC_PER_PAIR, 0, 4));
        assert_eq!((b.locked_yes(), b.locked_no()), (0, 0));
    }

    #[test]
    fn buy_no_sells_into_the_bids_and_a_limit_remainder_rests_as_a_paired_offer() {
        // F5's 11:00 bids, 65¢ × 5 from the bot and then Dave. Bob's Buy No Limit of 12 at 36¢ sells Yes at 64¢ or more.
        let mut b = book();
        let (bot, dave, bob) = (Pubkey::new_unique(), Pubkey::new_unique(), Pubkey::new_unique());
        b.place(&bot, &buy(OrderKind::Limit, 65, 5, 1), 10).unwrap();
        b.place(&dave, &buy(OrderKind::Limit, 65, 5, 1), 10).unwrap();
        let p = b.place_paired(&bob, &sell(OrderKind::Limit, 64, 12, 7), 10).unwrap();
        assert_eq!(
            p.fills(),
            vec![
                Fill { maker: bot, maker_order_id: 1, price: 65, quantity: 5 },
                Fill { maker: dave, maker_order_id: 1, price: 65, quantity: 5 },
            ]
        );
        assert_eq!((p.filled, p.fill_usdc, p.rested), (10, cents(650), 2), "12 pairs to mint: 10 sold, 2 resting");
        assert_eq!(levels(b.asks()), vec![(64, 2)]);
        assert_eq!(b.asks()[0].flags, PAIRED);
        assert_eq!(b.traders[b.asks()[0].trader as usize].owner, bob);
        assert_eq!((b.locked_yes(), b.locked_no()), (2, 2));
        assert_eq!((b.trader(&bot).unwrap().free_yes, b.trader(&dave).unwrap().free_yes), (5, 5));
    }

    #[test]
    fn a_market_buy_no_rests_nothing() {
        let mut b = book();
        b.place(&Pubkey::new_unique(), &buy(OrderKind::Limit, 65, 6, 1), 10).unwrap();
        let p = b.place_paired(&Pubkey::new_unique(), &sell(OrderKind::Market, 64, 10, 7), 10).unwrap();
        assert_eq!((p.filled, p.rested), (6, 0), "F5's partial fill: 6 of 10, so only 6 pairs are minted");
        assert!(b.asks().is_empty() && b.bids().is_empty());
    }

    #[test]
    fn cancelling_an_unsold_paired_offer_credits_1_00_per_pair() {
        let mut b = book();
        let bob = Pubkey::new_unique();
        b.place_paired(&bob, &sell(OrderKind::Limit, 67, 10, 1), 10).unwrap();
        assert_eq!(b.cancel(&bob, 1).unwrap(), (Side::Sell, 67, 10, true));
        let entry = b.trader(&bob).unwrap();
        assert_eq!((entry.free_usdc, entry.free_yes, entry.free_no, entry.open_orders), (10 * USDC_PER_PAIR, 0, 0, 0));
        assert!(b.asks().is_empty());
    }

    #[test]
    fn sell_no_takes_without_an_order_id_and_never_rests() {
        let TenSixteen { mut book, dave, bot, .. } = ten_sixteen();
        // Dave rests a bid with order ID 0, the ID Sell No's matching uses; it doesn't refuse his Sell No.
        book.place(&dave, &buy(OrderKind::Limit, 50, 1, 0), 10).unwrap();
        let p = book.take(&dave, Side::Buy, 66, 20, 10).unwrap();
        // His own offer at 65¢ is cancelled and its 10 Yes go back to his wallet (D90); the bot's 5 at 66¢ fill.
        assert_eq!(
            p.matches,
            vec![
                Match::SelfTrade(SelfTrade { order_id: 1, price: 65, quantity: 10 }),
                Match::Fill(Fill { maker: bot, maker_order_id: 1, price: 66, quantity: 5 }),
            ]
        );
        assert_eq!((p.filled, p.fill_usdc, p.returned, p.rested), (5, cents(330), 10, 0), "the other 15 are not placed");
        assert!(book.asks().is_empty());
        assert_eq!(levels(book.bids()), vec![(64, 5), (60, 10), (50, 1)]);
    }

    #[test]
    fn sell_no_checks_its_price_quantity_and_the_fill_limit() {
        let mut b = book();
        let o = Pubkey::new_unique();
        for price in [0, 100] {
            assert_eq!(b.take(&o, Side::Buy, price, 1, 10).unwrap_err(), MeridianError::InvalidPrice.into());
        }
        assert_eq!(b.take(&o, Side::Buy, 50, 0, 10).unwrap_err(), MeridianError::InvalidQuantity.into());
        assert_eq!(b.take(&o, Side::Buy, 50, 1, 0).unwrap_err(), MeridianError::FillLimitNotSet.into());
    }

    #[test]
    fn an_entry_holding_only_released_no_is_not_reused() {
        // Bob's paired offer of 1 sells, which leaves his entry 0.67 and 1 No and no orders. With the 0.67 paid out
        // (by hand here, as Return to owner would), the No alone keeps the entry his (D142).
        let mut b = book();
        let bob = Pubkey::new_unique();
        b.place_paired(&bob, &sell(OrderKind::Limit, 67, 1, 1), 10).unwrap();
        for i in 1..TRADER_CAPACITY {
            b.place(&Pubkey::new_unique(), &buy(OrderKind::Limit, 1 + (i % 50) as u8, 1, 1), 10).unwrap();
        }
        b.place(&Pubkey::new_unique(), &buy(OrderKind::Market, 67, 1, 1), 10).unwrap();
        let index = b.traders.iter().position(|t| t.owner == bob).unwrap();
        assert_eq!((b.traders[index].free_usdc, b.traders[index].free_no, b.traders[index].open_orders), (cents(67), 1, 0));
        b.traders[index].free_usdc = 0;
        let refused = b.place(&Pubkey::new_unique(), &buy(OrderKind::Limit, 5, 1, 1), 10);
        assert_eq!(refused.unwrap_err(), MeridianError::BookFull.into());
        assert_eq!((b.traders[index].owner, b.traders[index].free_no), (bob, 1));
    }

    #[test]
    fn cancelling_moves_what_the_order_locked_to_its_owners_balance() {
        // Carol cancels her bid of 10 at 60¢: 6.00 waits in the book for her (D99), and the book still balances.
        let TenSixteen { mut book, carol, dave, .. } = ten_sixteen();
        let locked = book.locked_usdc() + book.free_usdc();
        assert_eq!(book.cancel(&carol, 1).unwrap(), (Side::Buy, 60, 10, false));
        assert_eq!(book.trader(&carol).unwrap().free_usdc, cents(600));
        assert_eq!(book.trader(&carol).unwrap().open_orders, 0);
        assert_eq!(levels(book.bids()), vec![(64, 5)]);
        assert_eq!(book.locked_usdc() + book.free_usdc(), locked);
        assert_eq!(book.cancel(&dave, 1).unwrap(), (Side::Sell, 65, 10, false), "an offer's Yes go to the owner's balance");
        assert_eq!(book.trader(&dave).unwrap().free_yes, 10);
        assert_eq!(book.cancel(&carol, 1).unwrap_err(), MeridianError::OrderNotFound.into(), "only once");
        assert_eq!(book.cancel(&Pubkey::new_unique(), 1).unwrap_err(), MeridianError::OrderNotFound.into(), "only your own");
    }

    #[test]
    fn locked_plus_free_balances_account_for_every_token_in_the_book() {
        let TenSixteen { mut book, .. } = ten_sixteen();
        assert_eq!((book.locked_usdc(), book.locked_yes()), (cents(5 * 64 + 10 * 60), 15));
        book.place(&Pubkey::new_unique(), &buy(OrderKind::Market, 66, 12, 7), 10).unwrap();
        book.place(&Pubkey::new_unique(), &sell(OrderKind::Market, 60, 7, 7), 10).unwrap();
        // Asks: 66¢ × 3 left. Bids: 60¢ × 8 left. Dave holds 6.50 and the bot 1.32 from the buy; the bot holds 5 Yes and
        // Carol 2 from the sell.
        assert_eq!((book.locked_usdc(), book.locked_yes()), (cents(8 * 60), 3));
        assert_eq!((book.free_usdc(), book.free_yes()), (cents(650 + 132), 7));
    }
}
