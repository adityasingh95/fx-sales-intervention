// Synthetic, human-readable identifiers for the blotters (FXSW-066). A Request
// ID is assigned to every deal at creation; a Trade ID only when a deal
// executes. These are display identifiers distinct from the internal `dealId`.

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const randomSuffix = (len: number): string => {
  let s = '';
  for (let i = 0; i < len; i += 1) {
    s += ID_ALPHABET.charAt(Math.floor(Math.random() * ID_ALPHABET.length));
  }
  return s;
};

export const makeRequestId = (): string => `REQ-${randomSuffix(6)}`;
export const makeTradeId = (): string => `TRD-${randomSuffix(6)}`;
