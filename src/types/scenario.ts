import type { Deal, RejectionReason } from './deal';

export type ScenarioId =
  | 'HAPPY_PATH_ESP'
  | 'OFF_HOURS_INTERVENTION'
  | 'CREDIT_BREACH'
  | 'SIZE_LIMIT_MARGIN_TUNE'
  | 'RELEASE_PATH'
  | 'BOTH_SIDED_INQUIRY'
  | 'QUOTE_DEALT_INQUIRY';

// v1 set — surfaced by the dev injector at `?dev=1`.
export const V1_SCENARIO_IDS = [
  'HAPPY_PATH_ESP',
  'OFF_HOURS_INTERVENTION',
  'CREDIT_BREACH',
  'SIZE_LIMIT_MARGIN_TUNE',
  'RELEASE_PATH',
] as const satisfies readonly ScenarioId[];

// v2 additions — gated on `?dev=v2`.
export const V2_SCENARIO_IDS = [
  'BOTH_SIDED_INQUIRY',
  'QUOTE_DEALT_INQUIRY',
] as const satisfies readonly ScenarioId[];

// Full set — used internally by the scenario registry.
export const SCENARIO_IDS = [
  ...V1_SCENARIO_IDS,
  ...V2_SCENARIO_IDS,
] as const satisfies readonly ScenarioId[];

export type DealChannel = 'ESP' | 'SI';

export type FollowUpEvent = 'CLIENT_ACCEPT' | 'CLIENT_REJECT' | 'CLIENT_CANCEL' | 'EXPIRE';

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
