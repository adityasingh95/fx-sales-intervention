import type { DealEvent } from '@/services/feed/types';
import type { Deal } from '@/types/deal';
import { FORWARD_TENORS, resolveSwapLegs, defaultInstrumentForTenor, isForwardTenor } from '@/types/deal';
import type {
  FollowUpEvent,
  Scenario,
  ScenarioFollowUp,
  ScenarioId,
  ScenarioOverrides,
} from '@/types/scenario';
import { SCENARIOS } from './definitions';

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const makeDealId = (): string => {
  let id = 'd_';
  for (let i = 0; i < 6; i += 1) {
    id += ID_ALPHABET.charAt(Math.floor(Math.random() * ID_ALPHABET.length));
  }
  return id;
};

const buildFollowUpEvent = (event: FollowUpEvent, dealId: string): DealEvent => {
  switch (event) {
    case 'CLIENT_ACCEPT':
      return { type: 'CLIENT_ACCEPT', dealId };
    case 'CLIENT_REJECT':
      return { type: 'CLIENT_REJECT', dealId };
    case 'CLIENT_CANCEL':
      return { type: 'CLIENT_CANCEL', dealId };
    case 'EXPIRE':
      return { type: 'EXPIRE', dealId };
    case 'CLIENT_ACCEPT_OR_REJECT':
      return Math.random() < 0.5
        ? { type: 'CLIENT_ACCEPT', dealId }
        : { type: 'CLIENT_REJECT', dealId };
  }
};

type PendingTimer = ReturnType<typeof setTimeout>;

type Gate = {
  dealId: string;
  followUp: ScenarioFollowUp;
};

export type ScenarioPlayer = {
  inject(scenarioId: ScenarioId, overrides?: ScenarioOverrides): string;
  notifyDealState(dealId: string, siState: string): void;
  reset(): void;
};

export type PlayerOptions = {
  emit: (event: DealEvent) => void;
  now?: () => number;
  generateDealId?: () => string;
};

export const createScenarioPlayer = (opts: PlayerOptions): ScenarioPlayer => {
  const now = opts.now ?? Date.now;
  const generateDealId = opts.generateDealId ?? makeDealId;
  const timers = new Set<PendingTimer>();
  const gates = new Set<Gate>();

  const scheduleEvent = (event: DealEvent, delayMs: number): void => {
    const handle = setTimeout(() => {
      timers.delete(handle);
      opts.emit(event);
    }, delayMs);
    timers.add(handle);
  };

  const armFollowUp = (dealId: string, followUp: ScenarioFollowUp): void => {
    if (followUp.trigger.kind === 'delay') {
      scheduleEvent(buildFollowUpEvent(followUp.event, dealId), followUp.trigger.ms);
    } else {
      gates.add({ dealId, followUp });
    }
  };

  const buildDeal = (
    scenario: Scenario,
    dealId: string,
    overrides?: ScenarioOverrides,
  ): Deal => {
    const requestedTenor = overrides?.tenor ?? scenario.deal.tenor;
    const instrumentType =
      overrides?.instrumentType ??
      scenario.deal.instrumentType ??
      defaultInstrumentForTenor(requestedTenor);

    // A SWAP is two legs (docs/02 §12.3): the requested tenor is NEAR, the
    // override's farTenor is FAR (coerced strictly later). Deal.tenor mirrors the
    // NEAR leg so single-leg consumers stay coherent.
    if (instrumentType === 'SWAP') {
      const { legs, adjusted, requested } = resolveSwapLegs(requestedTenor, overrides?.farTenor);
      return {
        dealId,
        createdAt: now(),
        ...scenario.deal,
        instrumentType,
        tenor: legs[0].tenor,
        legs,
        ...(adjusted ? { swapRequested: requested } : {}),
      };
    }

    // An NDF must carry a forward tenor (docs/02 §12.2); a SPOT request is
    // coerced to the shortest forward tenor rather than rejected outright.
    const tenor =
      instrumentType === 'NDF' && !isForwardTenor(requestedTenor)
        ? FORWARD_TENORS[0]
        : requestedTenor;
    return {
      dealId,
      createdAt: now(),
      ...scenario.deal,
      tenor,
      instrumentType,
    };
  };

  return {
    inject(scenarioId, overrides) {
      const scenario = SCENARIOS[scenarioId];
      const dealId = generateDealId();
      const deal = buildDeal(scenario, dealId, overrides);
      const initial: DealEvent =
        scenario.channel === 'ESP'
          ? { type: 'NEW_ESP_DEAL', deal }
          : { type: 'NEW_SI_DEAL', deal, rejectionReasons: scenario.rejectionReasons };
      opts.emit(initial);
      for (const followUp of scenario.followUps) {
        armFollowUp(dealId, followUp);
      }
      return dealId;
    },

    notifyDealState(dealId, siState) {
      for (const gate of [...gates]) {
        if (gate.dealId !== dealId) continue;
        if (gate.followUp.trigger.kind !== 'after-si-state') continue;
        if (gate.followUp.trigger.state !== siState) continue;
        gates.delete(gate);
        scheduleEvent(buildFollowUpEvent(gate.followUp.event, dealId), gate.followUp.trigger.delayMs);
      }
    },

    reset() {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      gates.clear();
    },
  };
};
