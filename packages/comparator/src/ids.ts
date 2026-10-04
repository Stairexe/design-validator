/** FNV-1a 32-bit hash → short stable ID. Deterministic and platform independent. */
export function stableId(prefix: string, input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // Second pass with a different seed lowers collision odds for large reports.
  let hash2 = 0x01000193;
  for (let i = input.length - 1; i >= 0; i--) {
    hash2 ^= input.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x811c9dc5) >>> 0;
  }
  return `${prefix}_${hash.toString(16).padStart(8, '0')}${hash2.toString(16).padStart(8, '0')}`;
}
