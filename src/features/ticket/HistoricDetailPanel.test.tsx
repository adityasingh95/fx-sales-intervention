import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import HistoricDetailPanel from './HistoricDetailPanel';
import { useDealsStore, type HistoricEntry } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import type { Deal } from '@/types/deal';
import type { DealLifecycleEvent } from '@/types/lifecycle';

const deal: Deal = {
  dealId: 'd_hist',
  clientName: 'Acme Corp',
  accountCode: 'ACME-1',
  pair: 'EURUSD',
  side: 'BUY',
  dealtCcy: 'BASE',
  notional: 1_000_000,
  tenor: 'SPOT',
  defaultMarginPips: 3,
  createdAt: new Date(2026, 5, 15, 9, 0, 0).getTime(),
};

const events: DealLifecycleEvent[] = [
  { phase: 'REQUEST', at: deal.createdAt, channel: 'SI', toState: 'Initial' },
  { phase: 'PICKUP', at: deal.createdAt + 1000, channel: 'SI', toState: 'PickUpSent' },
  {
    phase: 'PRICE_BACK',
    at: deal.createdAt + 2000,
    channel: 'SI',
    toState: 'QuoteSent',
    appliedMargin: { kind: 'spot', margin: { bid: 4, ask: 5 } },
    aiSuggested: true,
    rationale: 'Off-hours premium',
  },
  { phase: 'RESPONSE', at: deal.createdAt + 3000, channel: 'SI', toState: 'TradeConfirmed' },
];

const entry: HistoricEntry = {
  deal,
  rejectionReasons: [],
  finalSiState: 'TradeConfirmed',
  finalRfsState: 'TradeConfirmed',
  outcome: 'Executed',
  archivedAt: deal.createdAt + 8000,
  events,
};

describe('HistoricDetailPanel', () => {
  beforeEach(() => {
    useDealsStore.setState({ deals: new Map(), historic: [entry] });
    useUiStore.setState({ openDealId: null, openHistoricId: null });
  });
  afterEach(cleanup);

  it('renders nothing when no historic deal is open', () => {
    render(<HistoricDetailPanel />);
    expect(screen.queryByTestId('historic-detail-panel')).toBeNull();
  });

  it('shows outcome, markup reason, and the lifecycle timeline when opened', () => {
    useUiStore.setState({ openHistoricId: 'd_hist' });
    render(<HistoricDetailPanel />);

    expect(screen.getByTestId('historic-detail-panel')).toHaveAttribute('data-deal-id', 'd_hist');
    expect(screen.getByTestId('detail-outcome')).toHaveAttribute('data-outcome', 'Executed');

    const markup = screen.getByTestId('markup-reason');
    expect(markup.textContent).toContain('Bid 4 / Ask 5 pips');
    expect(markup.textContent).toContain('AI-suggested');
    expect(markup.textContent).toContain('Off-hours premium');

    const phases = Array.from(
      screen.getByTestId('timeline-panel').querySelectorAll('[data-phase]'),
    ).map((el) => el.getAttribute('data-phase'));
    expect(phases).toEqual(['REQUEST', 'PICKUP', 'PRICE_BACK', 'RESPONSE']);
  });

  it('notes when no price was sent', () => {
    useDealsStore.setState({
      historic: [
        {
          ...entry,
          outcome: 'Rejected by Trader',
          events: [{ phase: 'REQUEST', at: deal.createdAt, channel: 'SI', toState: 'Initial' }],
        },
      ],
    });
    useUiStore.setState({ openHistoricId: 'd_hist' });
    render(<HistoricDetailPanel />);
    expect(screen.getByTestId('markup-reason').textContent).toContain('No price was sent');
  });
});
