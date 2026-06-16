import type { Deal, InstrumentType, RejectionReason, Tenor } from './deal';

// Per-injection overrides (FXSW-059, FXSW-078). The Dev Injector can inject any
// scenario as a forward (tenor) or as a specific instrument (instrumentType) at
// inject time — no scenario duplication.
export type ScenarioOverrides = {
  tenor?: Tenor;
  instrumentType?: InstrumentType;
};

export type ScenarioId =
  | 'HAPPY_PATH_ESP'
  | 'OFF_HOURS_INTERVENTION'
  | 'CREDIT_BREACH'
  | 'SIZE_LIMIT_MARGIN_TUNE'
  | 'RELEASE_PATH'
  | 'BOTH_SIDED_INQUIRY'
  | 'QUOTE_DEALT_INQUIRY';

export const SCENARIO_IDS = [
  'HAPPY_PATH_ESP',
  'OFF_HOURS_INTERVENTION',
  'CREDIT_BREACH',
  'SIZE_LIMIT_MARGIN_TUNE',
  'RELEASE_PATH',
  'BOTH_SIDED_INQUIRY',
  'QUOTE_DEALT_INQUIRY',
] as const satisfies readonly ScenarioId[];

export type DealChannel = 'ESP' | 'SI';

export type FollowUpEvent =
  | 'CLIENT_ACCEPT'
  | 'CLIENT_REJECT'
  | 'CLIENT_CANCEL'
  | 'EXPIRE'
  // Resolved randomly to CLIENT_ACCEPT or CLIENT_REJECT at scheduling
  // time. Used by CREDIT_BREACH so trader-sent quotes terminate via
  // either path, simulating realistic counterparty behavior on a
  // breached account.
  | 'CLIENT_ACCEPT_OR_REJECT';

export type FollowUpTrigger =
  | { kind: 'delay'; ms: number }
  | { kind: 'after-si-state'; state: string; delayMs: number };

export type ScenarioFollowUp = {
  trigger: FollowUpTrigger;
  event: FollowUpEvent;
};

export type Scenario = {
  id: ScenarioId;
  channel: DealChannel;
  deal: Omit<Deal, 'dealId' | 'createdAt'>;
  rejectionReasons: RejectionReason[];
  followUps: ScenarioFollowUp[];
};
