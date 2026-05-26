import type { ClientTier, Factor, SuggestionInput } from './types';

// docs/09 §7 message, exported as a constant so the engine and the panel
// share the exact text.
export const CREDIT_DECLINE_RATIONALE =
  'Credit limit breach — recommend declining. Suggested action: Reject.';

const TIER_LABEL: Record<ClientTier, string> = {
  platinum: 'Platinum',
  gold: 'Gold-tier',
  standard: 'Standard-tier',
  new: 'New',
};

const MAX_LEN = 120;
const MAX_FACTOR_PARTS = 3;

function buildClientPhrase(input: SuggestionInput): string {
  const tier = TIER_LABEL[input.client.tier];
  const c = input.client;
  // Enrich the tier phrase with a positive behaviour signal when present;
  // surfaces "Platinum client with strong recent acceptance" rather than
  // splitting tier + behaviour across two awkward clauses.
  if (
    c.recentBehaviorFlag === 'high_engagement' &&
    c.recent30dAcceptanceRate >= 0.7
  ) {
    return `${tier} client with strong recent acceptance`;
  }
  return `${tier} client`;
}

function craftFactorPhrase(f: Factor, input: SuggestionInput): string | null {
  switch (f.name) {
    case 'Notional size': {
      const m = Math.round(input.deal.notional / 1_000_000);
      return `${m}M ${input.deal.pair}`;
    }
    case 'Off-hours':
      return `off-hours ${input.deal.pair}`;
    case 'Size band breach':
      return 'above auto-pricer band';
    case 'Volatility':
      return 'elevated volatility';
    case 'Session liquidity':
      return 'thin session liquidity';
    case 'Pair class':
      // Pair name typically surfaces via the Off-hours / Notional phrase
      // for the same deal; skipping avoids "off-hours USDJPY, USDJPY
      // wider-spread."
      return null;
    case 'Retention':
      return 'flight risk — tightening';
    case 'VIP volume':
      // Already folded into the enriched client phrase when applicable;
      // skip to avoid "Platinum client with strong recent acceptance,
      // top-volume client".
      return null;
    case 'Acceptance rate':
      return 'low recent acceptance';
    default:
      return null;
  }
}

function compose(parts: string[], suggestedPips: number): string {
  const unit = suggestedPips === 1 ? 'pip' : 'pips';
  return `${parts.join(', ')} — suggesting ${suggestedPips} ${unit}.`;
}

// docs/09 §8 — pick the highest-magnitude factors, craft short natural-
// language phrases, drop lowest-magnitude entries until the line fits.
export function buildRationale(
  factors: Factor[],
  suggestedPips: number,
  input: SuggestionInput,
): string {
  const parts: string[] = [buildClientPhrase(input)];

  // Sort non-tier factors by |delta| descending so truncation drops the
  // weakest signals first.
  const ordered = factors
    .filter((f) => f.name !== 'Client tier')
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  let added = 0;
  for (const f of ordered) {
    if (added >= MAX_FACTOR_PARTS) break;
    const phrase = craftFactorPhrase(f, input);
    if (phrase) {
      parts.push(phrase);
      added += 1;
    }
  }

  let result = compose(parts, suggestedPips);
  while (result.length > MAX_LEN && parts.length > 1) {
    parts.pop();
    result = compose(parts, suggestedPips);
  }
  return result;
}
