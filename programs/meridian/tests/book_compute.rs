//! The order-book spike (D21, M1-a, P30): Place order on a full book in Mollusk, with the compute each fill costs,
//! and the pass mark the user accepted before anything was measured.
//!
//! The pass mark: the worst case at the fill limit is Buy No (M2), which mints pairs and then sells their Yes. It is
//! estimated as the dearer of a buy and a sell with that many fills, plus what Mint pairs adds: one USDC transfer
//! and two Token-2022 mints, three calls into the token programs, and one more event. It must stay within 75% of the
//! 1,400,000 compute units a transaction may use. At 10 fills that is a pass; from 1 to 9 the user chooses; if one
//! fill doesn't fit, the D21 fallback is discussed.
mod common;

use {
    anchor_lang::prelude::Pubkey,
    common::{full_book, mollusk, program_account, token_account, usdc_mint, yes_mint, Market, Order, TOKEN, TOKEN_2022},
    meridian::{Book, Side, SIDE_CAPACITY},
    solana_account::Account,
};

const LIMIT: u64 = 1_400_000;
const PASS_MARK: u64 = LIMIT * 3 / 4;
/// The fill limit the spike sets (D21, M1.01): at 32 fills the worst case stays under the 200,000 compute units an
/// instruction gets without asking for more, so no wallet needs to raise its budget, and uses about half of a
/// transaction's 64 instructions, leaving room for Buy No's extra calls (M2).
const FILL_LIMIT: u32 = 32;

/// Compute for a Market order that reaches `fills` resting orders, after checking it filled exactly that many, or
/// the program's failure.
fn try_measure(side: Side, fills: u32) -> Result<u64, String> {
    let Market { m, ix, accounts, book, .. } = full_book(Order::reaching(side, fills));
    let r = m.process_instruction(&ix, &accounts);
    if !r.program_result.is_ok() {
        return Err(format!("{:?}", r.program_result));
    }
    let data = &r.get_account(&book).unwrap().data;
    let after: &Book = bytemuck::from_bytes(&data[8..]);
    let left = if side == Side::Buy { after.ask_count } else { after.bid_count } as u32;
    assert_eq!(left, SIDE_CAPACITY as u32 - fills, "{side:?} {fills}");
    Ok(r.compute_units_consumed)
}

fn measure(side: Side, fills: u32) -> u64 {
    try_measure(side, fills).unwrap_or_else(|e| panic!("{side:?} {fills}: {e}"))
}

/// The token instructions Mint pairs adds on top of a sell, measured on their own: USDC into the vault, then a
/// Token-2022 mint (twice: Yes and No).
fn token_steps() -> (u64, u64) {
    let m = mollusk();
    let (owner, usdc, vault, yes, holder, usdc_mint_key) =
        (Pubkey::new_unique(), Pubkey::new_unique(), Pubkey::new_unique(), Pubkey::new_unique(), Pubkey::new_unique(), Pubkey::new_unique());
    let transfer = spl_token_2022_interface::instruction::transfer_checked(&TOKEN, &usdc, &usdc_mint_key, &vault, &owner, &[], 10_000_000, 6).unwrap();
    let t = m.process_instruction(
        &transfer,
        &[
            (usdc, token_account(&m, TOKEN, usdc_mint_key, owner, 1_000_000_000)),
            (usdc_mint_key, usdc_mint(&m, 10_000_000_000)),
            (vault, token_account(&m, TOKEN, usdc_mint_key, Pubkey::new_unique(), 0)),
            (owner, Account { lamports: 1_000_000_000, ..Account::default() }),
            program_account(TOKEN),
        ],
    );
    assert!(t.program_result.is_ok(), "{:?}", t.program_result);
    let authority = Pubkey::new_unique();
    let mint_to = spl_token_2022_interface::instruction::mint_to(&TOKEN_2022, &yes, &holder, &authority, &[], 10).unwrap();
    let r = m.process_instruction(
        &mint_to,
        &[
            (yes, yes_mint(&m, authority, 0)),
            (holder, token_account(&m, TOKEN_2022, yes, Pubkey::new_unique(), 0)),
            (authority, Account { lamports: 1_000_000_000, ..Account::default() }),
            program_account(TOKEN_2022),
        ],
    );
    assert!(r.program_result.is_ok(), "{:?}", r.program_result);
    (t.compute_units_consumed, r.compute_units_consumed)
}

#[test]
fn the_book_passes_the_spike_gate_at_the_fill_limit() {
    // The most fills one order can take. Each fill's event is a call into the program, and a transaction holds at
    // most 64 instructions, counting the order and its two token transfers (M1.01). With Anchor's emit_cpi! the
    // program's 32 KB heap ran out first, at 43 fills.
    let ceiling = (1..=SIDE_CAPACITY as u32)
        .take_while(|&n| try_measure(Side::Buy, n).is_ok() && try_measure(Side::Sell, n).is_ok())
        .last()
        .unwrap_or(0);
    if ceiling < SIDE_CAPACITY as u32 {
        let past = try_measure(Side::Buy, ceiling + 1).unwrap_err();
        assert_eq!(past, "Failure(MaxInstructionTraceLengthExceeded)", "the order past the ceiling failed some other way");
    }
    let counts: Vec<u32> = [0, 1, 2, 5, 10, 16, 20, 24, 32, ceiling].into_iter().filter(|&n| n <= ceiling).collect();
    let rows: Vec<(u32, u64, u64)> = counts.iter().map(|&n| (n, measure(Side::Buy, n), measure(Side::Sell, n))).collect();
    let at = |n: u32| *rows.iter().find(|r| r.0 == n).unwrap();
    let dearer = |n: u32| at(n).1.max(at(n).2);
    // Each fill adds the same work, so the slope between 10 fills and the ceiling is the cost of one.
    let per_fill = (dearer(ceiling) - dearer(10)) / (ceiling as u64 - 10);
    // The jump from no fills to one is a fill plus the two token transfers it starts; what is left after the
    // transfers' own work is the cost of calling another program, twice.
    let (usdc_transfer, mint_to) = token_steps();
    let per_call = (at(1).1 - at(0).1).saturating_sub(per_fill + usdc_transfer + usdc_transfer.max(mint_to)) / 2;
    let mint_extra = usdc_transfer + 2 * mint_to + 3 * per_call + per_fill;
    let worst = |n: u32| dearer(n) + mint_extra;

    println!("fills  buy CU  sell CU  worst case with Mint pairs  share of 1.4M");
    for &(n, b, s) in &rows {
        let w = b.max(s) + mint_extra;
        println!("{n:>5}  {b:>7}  {s:>7}  {w:>26}  {:>5.1}%", 100.0 * w as f64 / LIMIT as f64);
    }
    println!("per fill {per_fill}; per call into a token program {per_call}; USDC transfer {usdc_transfer}; Token-2022 mint {mint_to}; Mint pairs adds {mint_extra}");
    println!("ceiling: {ceiling} fills (64 instructions); fill limit {FILL_LIMIT}");

    assert!(worst(1) <= LIMIT, "FAIL (D21): one fill doesn't fit");
    assert!(worst(10) <= PASS_MARK, "below the pass mark: {} CU at 10 fills; the user chooses (P30)", worst(10));
    assert!(FILL_LIMIT <= ceiling, "the fill limit {FILL_LIMIT} is past the ceiling {ceiling}");
    assert!(worst(FILL_LIMIT) <= 200_000, "the fill limit {FILL_LIMIT} needs more than an instruction's default 200,000 compute units");
}
