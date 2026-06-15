import type { LifecyclePhase } from '@/types/lifecycle';

// Pure mapping from a machine state transition (keyed by destination state) to
// a lifecycle phase for the historical timeline (FXSW-049). Only the
// trader-meaningful waypoints map; steady states and ack-only `*Sent` states
// that don't represent a phase return null and are not logged.
//
// Kept out of dealsStore so it can be unit-tested in isolation and to keep the
// store under the 300-line limit.

const SI_PHASE: Record<string, LifecyclePhase | undefined> = {
  PickUpSent: 'PICKUP',
  QuoteSent: 'PRICE_BACK',
  HoldSent: 'RELEASE',
  // Quote taken back by the trader (Quoted + Withdraw → WithdrawSent → PickedUp).
  // Logged as its own waypoint so the timeline shows the take-back (FXSW-065).
  WithdrawSent: 'WITHDRAWN',
  TradeConfirmed: 'RESPONSE',
  ClientRejected: 'RESPONSE',
  TraderRejected: 'RESPONSE',
};

// ESP (auto-priced) deals never leave SI `Initial`, so their timeline is
// derived from the RFS machine instead. The machine auto-prices straight to
// `Executable`, which is a distinct AUTO_PRICE waypoint — not a trader
// PRICE_BACK — so the timeline reads "Auto-priced" rather than "Priced back"
// (FXSW-070).
const RFS_PHASE: Record<string, LifecyclePhase | undefined> = {
  Executable: 'AUTO_PRICE',
  TradeConfirmed: 'RESPONSE',
  Expired: 'RESPONSE',
  ClientClosed: 'RESPONSE',
};

export const lifecyclePhaseFor = (
  channel: 'SI' | 'RFS',
  toState: string,
): LifecyclePhase | null =>
  (channel === 'SI' ? SI_PHASE[toState] : RFS_PHASE[toState]) ?? null;
