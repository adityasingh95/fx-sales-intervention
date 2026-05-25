import type { Pair } from '@/services/feed/types';

export type Side = 'BUY' | 'SELL';

export type Tenor = 'SPOT';

export type RejectionReason = 'OFF_HOURS' | 'SIZE_LIMIT' | 'CREDIT_LIMIT';

export type Deal = {
  dealId: string;
  clientName: string;
  accountCode: string;
  pair: Pair;
  side: Side;
  notional: number;
  tenor: Tenor;
  defaultMarginPips: number;
  createdAt: number;
};
