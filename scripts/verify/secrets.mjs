// No key file or secret is committed (D17). Secrets live in .env, which git ignores;
// .env.example lists their names with empty values.

const SECRET_FILES = [
  [/(^|\/)\.env(\.(?!example$)[^/]*)?$/, 'an environment file (only .env.example is committed)'],
  [/keypair[^/]*\.json$/i, 'a key-pair file'],
  [/(^|\/)id\.json$/, "a Solana CLI key file"],
  [/\.(pem|key|p12|pfx)$/i, 'a private-key file'],
];

const SECRET_TEXT = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a PEM private key'],
  [/\[\s*(?:\d{1,3}\s*,\s*){63}\d{1,3}\s*\]/, 'a 64-byte key array (a Solana secret key)'],
  [/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{40,}/, 'a GitHub token'],
  [/\bFlyV1 [A-Za-z0-9_]{20,}/, 'a Fly.io token'],
  [/\b\d{8,10}:[A-Za-z0-9_-]{35}\b/, 'a Telegram bot token'],
  [/hc-ping\.com\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, 'a Healthchecks ping URL'],
  [/alchemy\.com\/v2\/[A-Za-z0-9_-]{20,}/, 'an Alchemy key in a URL'],
];

// files: Map of path to text (binary files left out).
export function checkSecrets(files) {
  const problems = [];
  for (const [path, text] of files) {
    for (const [pattern, what] of SECRET_FILES) {
      if (pattern.test(path)) problems.push(`${path} looks like ${what}`);
    }
    for (const [pattern, what] of SECRET_TEXT) {
      if (pattern.test(text)) problems.push(`${path} contains ${what}`);
    }
    if (/(^|\/)\.env\.example$/.test(path)) {
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(\S.*)$/);
        if (m) problems.push(`${path} gives ${m[1]} a value; .env.example lists names only`);
      }
    }
  }
  return problems;
}
