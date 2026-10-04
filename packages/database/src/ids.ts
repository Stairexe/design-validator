import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

/** Prefixed, URL-safe random IDs such as `prj_7m2k9d4w1q8x3c5v`. */
export function newId(prefix: 'prj' | 'src' | 'aud'): string {
  const bytes = randomBytes(16);
  let id = '';
  for (const byte of bytes) id += ALPHABET.charAt(byte % 32);
  return `${prefix}_${id}`;
}

export const now = () => new Date().toISOString();
