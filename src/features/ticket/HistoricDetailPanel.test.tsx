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
  requestId: 'REQ-TEST01',
  tradeId: 'TRD-TEST01',
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
    expect(screen.getByTestId('detail-request-id').textContent).toBe('REQ-TEST01');
    expect(screen.getByTestId('detail-trade-id').textContent).toBe('TRD-TEST01');

    const markup = screen.getByTestId('markup-reason');
    expect(markup.textContent).toContain('Bid 4 / Ask 5 pips');
    expect(markup.textContent).toContain('AI-suggested');
    expect(markup.textContent).toContain('Off-hours premium');

    const phases = Array.from(
      screen.getByTestId('timeline-panel').querySelectorAll('[data-phase]'),
    ).map((el) => el.getAttribute('data-phase'));
    expect(phases).toEqual(['REQUEST', 'PICKUP', 'PRICE_BACK', 'RESPONSE']);
  });

  it('shows an auto-priced markup note + AUTO_PRICE timeline phase for ESP deals', () => {
    useDealsStore.setState({
      historic: [
        {
          ...entry,
          tradeId: 'TRD-ESP001',
          events: [
            { phase: 'REQUEST', at: deal.createdAt, channel: 'RFS', toState: 'Queued' },
            { phase: 'AUTO_PRICE', at: deal.createdAt + 50, channel: 'RFS', toState: 'Executable' },
            {
              phase: 'RESPONSE',
              at: deal.createdAt + 2000,
              channel: 'RFS',
              toState: 'TradeConfirmed',
            },
          ],
        },
      ],
    });
    useUiStore.setState({ openHistoricId: 'd_hist' });
    render(<HistoricDetailPanel />);
    expect(screen.getByTestId('markup-reason').textContent).toContain('Auto-priced');

    const phases = Array.from(
      screen.getByTestId('timeline-panel').querySelectorAll('[data-phase]'),
    ).map((el) => el.getAttribute('data-phase'));
    expect(phases).toEqual(['REQUEST', 'AUTO_PRICE', 'RESPONSE']);
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

  it('renders the swap leg detail + net-points markup reason for a swap deal (FXSW-086)', () => {
    const swapDeal: Deal = {
      ...deal,
      pair: 'USDINR',
      instrumentType: 'SWAP',
      tenor: '1M',
      legs: [
        { kind: 'NEAR', tenor: '1M' },
        { kind: 'FAR', tenor: '6M' },
      ],
    };
    useDealsStore.setState({
      historic: [
        {
          ...entry,
          deal: swapDeal,
          events: [
            { phase: 'REQUEST', at: swapDeal.createdAt, channel: 'SI', toState: 'Initial' },
            {
              phase: 'PRICE_BACK',
              at: swapDeal.createdAt + 2000,
              channel: 'SI',
              toState: 'QuoteSent',
              appliedMargin: { kind: 'swap', mode: 'TOTAL', net: { bid: 2, ask: 3 } },
            },
            {
              phase: 'RESPONSE',
              at: swapDeal.createdAt + 3000,
              channel: 'SI',
              toState: 'TradeConfirmed',
            },
          ],
        },
      ],
    });
    useUiStore.setState({ openHistoricId: 'd_hist' });
    render(<HistoricDetailPanel />);

    expect(screen.getByTestId('swap-detail')).toBeTruthy();
    expect(screen.getByTestId('swap-detail-near').textContent).toContain('1M');
    expect(screen.getByTestId('swap-detail-far').textContent).toContain('6M');
    // The execution row appears (a swap margin was captured).
    expect(screen.getByTestId('swap-detail-exec-bid')).toBeTruthy();
    // Markup reason renders the net-points swap summary.
    expect(screen.getByTestId('markup-reason').textContent).toContain('Net 2/3 pips');
    expect(screen.getByTestId('markup-reason').textContent).toContain('Total');
  });

  it('shows the executed side + two-way request note for a both-sided deal (FXSW-092)', () => {
    useDealsStore.setState({
      historic: [
        {
          ...entry,
          deal: { ...deal, side: 'BOTH' },
          executedSide: 'ASK',
          events: [
            { phase: 'REQUEST', at: deal.createdAt, channel: 'SI', toState: 'Initial' },
            {
              phase: 'PRICE_BACK',
              at: deal.createdAt + 2000,
              channel: 'SI',
              toState: 'QuoteSent',
              appliedMargin: { kind: 'spot', margin: { bid: 4, ask: 5 } },
            },
            { phase: 'RESPONSE', at: deal.createdAt + 3000, channel: 'SI', toState: 'TradeConfirmed' },
          ],
        },
      ],
    });
    useUiStore.setState({ openHistoricId: 'd_hist' });
    render(<HistoricDetailPanel />);

    const banner = screen.getByTestId('execution-side');
    expect(banner).toHaveAttribute('data-executed-side', 'ASK');
    // ASK = bank sells base = client buys base (EUR).
    expect(banner.textContent).toContain('Client buys EUR');
    expect(screen.getByTestId('execution-request-note')).toBeTruthy();
  });

  it('omits the executed-side banner when no side was recorded', () => {
    useUiStore.setState({ openHistoricId: 'd_hist' });
    render(<HistoricDetailPanel />); // base entry has no executedSide
    expect(screen.queryByTestId('execution-side')).toBeNull();
  });
});
