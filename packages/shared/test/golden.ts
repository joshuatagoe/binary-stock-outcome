import { readFileSync } from 'node:fs';

/** Reads one of packages/golden's frozen files. The same files the Rust tests read. */
export function golden<T = any>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../../golden/${name}.json`, import.meta.url), 'utf8')) as T;
}
