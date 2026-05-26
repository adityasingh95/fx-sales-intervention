import type { Factor, SuggestionInput } from './types';

// FXSW-023 stub. Returns a minimal one-liner so the engine can compile and
// run end-to-end; FXSW-024 replaces this with the docs/09 §8 builder.
export function buildRationale(
  _factors: Factor[],
  suggestedPips: number,
  _input: SuggestionInput,
): string {
  return `Suggesting ${suggestedPips} pips.`;
}
