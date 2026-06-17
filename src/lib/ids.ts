// Synthetic, human-readable identifiers for the blotters (FXSW-066). A Request
// ID is assigned to every deal at creation; a Trade ID only when a deal
// executes. These are display identifiers distinct from the internal `dealId`.

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// FXSW-090 F-3: the random source is injectable (defaulting to Math.random) so a
// test can pin the suffix with a seeded generator (e.g. services/feed/rng) and
// assert stable ids. The REQ-/TRD- prefixes + 6-char format are unchanged.
const randomSuffix = (len: number, rand: () => number): string => {
  let s = '';
  for (let i = 0; i < len; i += 1) {
    s += ID_ALPHABET.charAt(Math.floor(rand() * ID_ALPHABET.length));
  }
  return s;
};

export const makeRequestId = (rand: () => number = Math.random): string =>
  `REQ-${randomSuffix(6, rand)}`;
export const makeTradeId = (rand: () => number = Math.random): string =>
  `TRD-${randomSuffix(6, rand)}`;
