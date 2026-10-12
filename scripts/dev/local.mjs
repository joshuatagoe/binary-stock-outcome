// make dev's helpers (D74), kept apart from up.mjs so they can be tested.

// The program's bytes as hex chunks for Surfpool's surfnet_writeProgram, which refuses a 0x prefix.
export function chunks(bytes, size) {
  const parts = [];
  for (let offset = 0; offset < bytes.length; offset += size) {
    parts.push({ offset, hex: bytes.subarray(offset, offset + size).toString('hex') });
  }
  return parts;
}

// The program needs a build when there is none, or when any source changed after it was built.
export function needsBuild(builtAt, sourceTimes) {
  return builtAt == null || sourceTimes.some((t) => t > builtAt);
}

// wsl's arguments to run one bash command inside WSL from the same folder, on Windows (P11). Only the Solana tools
// run there: npm installed the Node packages for Windows, and the website's bundler has no Linux copy in them.
export function wslArgs(linuxPath, command) {
  const quote = (s) => `'${s.replaceAll("'", "'\\''")}'`;
  return ['-e', 'bash', '-lc', `cd ${quote(linuxPath)} && ${command}`];
}
