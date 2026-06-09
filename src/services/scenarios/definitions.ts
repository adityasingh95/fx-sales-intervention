import type { Scenario, ScenarioId } from '@/types/scenario';

const DEFAULT_MARGIN_PIPS = 3;

const HAPPY_PATH_ESP: Scenario = {
  id: 'HAPPY_PATH_ESP',
  channel: 'ESP',
  deal: {
    clientName: 'Acme Corp',
    accountCode: 'ACME-EUR-1',
    pair: 'EURUSD',
    side: 'BUY',
    notional: 1_000_000,
    dealtCcy: 'BASE',
    tenor: 'SPOT',
    defaultMarginPips: DEFAULT_MARGIN_PIPS,
  },
  rejectionReasons: [],
  followUps: [{ trigger: { kind: 'delay', ms: 2000 }, event: 'CLIENT_ACCEPT' }],
};

const OFF_HOURS_INTERVENTION: Scenario = {
  id: 'OFF_HOURS_INTERVENTION',
  channel: 'SI',
  deal: {
    clientName: 'Globex Industries',
    accountCode: 'GLBX-JPY-2',
    pair: 'USDJPY',
    side: 'SELL',
    notional: 5_000_000,
    dealtCcy: 'BASE',
    tenor: 'SPOT',
    defaultMarginPips: DEFAULT_MARGIN_PIPS,
  },
  rejectionReasons: ['OFF_HOURS'],
  followUps: [
    { trigger: { kind: 'after-si-state', state: 'Quoted', delayMs: 1500 }, event: 'CLIENT_ACCEPT' },
  ],
};

const CREDIT_BREACH: Scenario = {
  id: 'CREDIT_BREACH',
  channel: 'SI',
  deal: {
    clientName: 'Halcyon Capital',
    accountCode: 'HALC-GBP-1',
    pair: 'GBPUSD',
    side: 'BUY',
    notional: 25_000_000,
    dealtCcy: 'BASE',
    tenor: 'SPOT',
    defaultMarginPips: DEFAULT_MARGIN_PIPS,
  },
  rejectionReasons: ['CREDIT_LIMIT'],
  followUps: [],
};

const SIZE_LIMIT_MARGIN_TUNE: Scenario = {
  id: 'SIZE_LIMIT_MARGIN_TUNE',
  channel: 'SI',
  deal: {
    clientName: 'Northwind FX',
    accountCode: 'NRTH-EUR-3',
    pair: 'EURUSD',
    side: 'SELL',
    notional: 12_000_000,
    dealtCcy: 'BASE',
    tenor: 'SPOT',
    defaultMarginPips: DEFAULT_MARGIN_PIPS,
  },
  rejectionReasons: ['SIZE_LIMIT'],
  followUps: [
    { trigger: { kind: 'after-si-state', state: 'Quoted', delayMs: 2000 }, event: 'CLIENT_ACCEPT' },
  ],
};

const RELEASE_PATH: Scenario = {
  id: 'RELEASE_PATH',
  channel: 'SI',
  deal: {
    clientName: 'Polaris Holdings',
    accountCode: 'POLR-INR-1',
    pair: 'USDINR',
    side: 'BUY',
    notional: 3_000_000,
    dealtCcy: 'BASE',
    tenor: 'SPOT',
    defaultMarginPips: DEFAULT_MARGIN_PIPS,
  },
  rejectionReasons: ['SIZE_LIMIT'],
  followUps: [],
};

const BOTH_SIDED_INQUIRY: Scenario = {
  id: 'BOTH_SIDED_INQUIRY',
  channel: 'SI',
  deal: {
    clientName: 'Acme Corp',
    accountCode: 'ACME-EUR-2',
    pair: 'EURUSD',
    side: 'BOTH',
    dealtCcy: 'BASE',
    notional: 8_000_000,
    tenor: 'SPOT',
    defaultMarginPips: DEFAULT_MARGIN_PIPS,
  },
  rejectionReasons: ['SIZE_LIMIT'],
  followUps: [
    { trigger: { kind: 'after-si-state', state: 'Quoted', delayMs: 1800 }, event: 'CLIENT_ACCEPT' },
  ],
};

const QUOTE_DEALT_INQUIRY: Scenario = {
  id: 'QUOTE_DEALT_INQUIRY',
  channel: 'SI',
  deal: {
    clientName: 'Northwind FX',
    accountCode: 'NRTH-JPY-1',
    pair: 'USDJPY',
    side: 'SELL',
    dealtCcy: 'QUOTE',
    notional: 1_000_000_000,
    tenor: 'SPOT',
    defaultMarginPips: DEFAULT_MARGIN_PIPS,
  },
  rejectionReasons: ['OFF_HOURS'],
  followUps: [
    { trigger: { kind: 'after-si-state', state: 'Quoted', delayMs: 1500 }, event: 'CLIENT_ACCEPT' },
  ],
};

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  HAPPY_PATH_ESP,
  OFF_HOURS_INTERVENTION,
  CREDIT_BREACH,
  SIZE_LIMIT_MARGIN_TUNE,
  RELEASE_PATH,
  BOTH_SIDED_INQUIRY,
  QUOTE_DEALT_INQUIRY,
};
