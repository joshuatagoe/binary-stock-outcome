// Runs with Node 24 directly (type stripping): node clients/ts/examples/config-address.ts
// Derives Config's address and encodes an Initialize Config, with nothing sent.
import { address } from '@solana/kit';
import { findConfigPda, getInitializeConfigInstructionDataEncoder, MERIDIAN_PROGRAM_ADDRESS } from '../src/generated/index.ts';

const [config, bump] = await findConfigPda();
const data = getInitializeConfigInstructionDataEncoder().encode({
  admin: address('5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q'),
  operator: address('AXwqBeBHE8S7YgngNQmudHYijxNpvQMPEkTymR59ZZXY'),
  usdcMint: address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  pythReceivers: [address('rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ')],
  tickers: [{ symbol: 'META', feedId: new Uint8Array(32).fill(0x78), strikeStepCents: 1000, enabled: true }],
  ladderBps: [300, 600, 900],
  thresholds: {
    ordersCloseBeforeSecs: 5, publishWindowSecs: 5, maxBandBps: 25, overrideBoundBps: 50,
    overrideWaitSecs: 3600, overrideWaitLongSecs: 86400, operatorOnlySettleSecs: 86400,
    adminHoldBackstopSecs: 86400, bandHoldBackstopSecs: 604800, noPriceHoldAfterSecs: 900,
  },
});
console.log(`program ${MERIDIAN_PROGRAM_ADDRESS}`);
console.log(`config  ${config} (bump ${bump})`);
console.log(`initialize_config data: ${data.length} bytes`);
