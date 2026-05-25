import type { Deal, RejectionReason } from './deal';

export type ScenarioId =
  | 'HAPPY_PATH_ESP'
  | 'OFF_HOURS_INTERVENTION'
  | 'CREDIT_BREACH'
  | 'SIZE_LIMIT_MARGIN_TUNE'
  | 'RELEASE_PATH';

export const SCENARIO_IDS = [
  'HAPPY_PATH_ESP',
  'OFF_HOURS_INTERVENTION',
  'CREDIT_BREACH',
  'SIZE_LIMIT_MARGIN_TUNE',
  'RELEASE_PATH',
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
