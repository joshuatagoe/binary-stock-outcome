//! Place order's events reach the chain (D62): the event calls inside the transaction, decoded with the program's own
//! event types, in the order the taker's order reached each resting order. Run in LiteSVM, which records a
//! transaction's inner instructions, with devnet's token programs (tests/fixtures).
mod common;

use {
    anchor_lang::{event::EVENT_IX_TAG_LE, AnchorDeserialize, Discriminator},
    common::{full_book, Order, TOKEN, TOKEN_2022},
    litesvm::LiteSVM,
    meridian::{
        events::{Fill, OrderCancelled, OrderPlaced},
        OrderKind, PlaceOrderArgs, Side,
    },
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

/// Sends the order and lists the program's events, each as a short description.
fn events(o: Order) -> Vec<String> {
    let taker = Keypair::new();
    let mk = full_book(Order { taker: Some(taker.pubkey()), ..o });
    let mut svm = LiteSVM::new();
    svm.add_program(meridian::ID, include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/meridian.so"))).unwrap();
    svm.add_program(TOKEN, include_bytes!("fixtures/spl_token.so")).unwrap();
    svm.add_program(TOKEN_2022, include_bytes!("fixtures/spl_token_2022.so")).unwrap();
    for (key, account) in &mk.accounts {
        if !account.executable && account.lamports > 0 {
            svm.set_account(*key, account.clone()).unwrap();
        }
    }
    let msg = Message::new_with_blockhash(&[mk.ix.clone()], Some(&taker.pubkey()), &svm.latest_blockhash());
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg.clone()), &[&taker]).unwrap();
    let meta = svm.send_transaction(tx).unwrap_or_else(|e| panic!("{:?}\n{}", e.err, e.meta.logs.join("\n")));
    meta.inner_instructions
        .iter()
        .flatten()
        .filter(|i| msg.account_keys[i.instruction.program_id_index as usize] == meridian::ID)
        .map(|i| describe(&i.instruction.data))
        .collect()
}

fn describe(data: &[u8]) -> String {
    assert_eq!(&data[..8], EVENT_IX_TAG_LE, "an event call starts with Anchor's tag");
    let (discriminator, mut fields) = (&data[8..16], &data[16..]);
    if discriminator == Fill::DISCRIMINATOR {
        let f = Fill::deserialize(&mut fields).unwrap();
        format!("fill {}x{} at {}¢", f.quantity, f.maker_order_id, f.price)
    } else if discriminator == OrderCancelled::DISCRIMINATOR {
        let c = OrderCancelled::deserialize(&mut fields).unwrap();
        format!("cancel order {} ({}x{}¢, {:?})", c.order_id, c.quantity, c.price, c.reason)
    } else if discriminator == OrderPlaced::DISCRIMINATOR {
        let p = OrderPlaced::deserialize(&mut fields).unwrap();
        format!("placed order {} ({}x{}¢)", p.order_id, p.quantity, p.price)
    } else {
        panic!("not one of Place order's events: {discriminator:?}")
    }
}

#[test]
fn a_self_trades_cancel_comes_before_the_fill_it_preceded() {
    let own = PlaceOrderArgs { side: Side::Sell, kind: OrderKind::Limit, price: 35, quantity: 2, order_id: 9 };
    let o = Order { price: 36, quantity: 1, makers: 4, taker_rests: Some(own), ..Order::reaching(Side::Buy, 1) };
    assert_eq!(events(o), vec!["cancel order 9 (2x35¢, SelfTrade)", "fill 1x1 at 36¢"]);
}

#[test]
fn fills_then_the_resting_remainder_are_recorded() {
    let o = Order { kind: OrderKind::Limit, price: 37, quantity: 5, makers: 4, ..Order::reaching(Side::Buy, 1) };
    assert_eq!(events(o), vec!["fill 1x1 at 36¢", "fill 1x1 at 37¢", "placed order 1 (3x37¢)"]);
}
