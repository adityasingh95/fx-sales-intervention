import type { Pair } from '../types';

// External market-data feed (FXSW-051). Opt-in, off by default. Surfaces a
// coarse status for a generic UI indicator — the UI never names the provider.
export type ExternalFeedStatus = 'off' | 'connecting' | 'live' | 'error' | 'rate-limited';

export type MidMap = Partial<Record<Pair, number>>;
