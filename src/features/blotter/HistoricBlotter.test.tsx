import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { useDealsStore, type HistoricEntry } from '@/state/stores/dealsStore';
import type { Deal } from '@/types/deal';
import { HistoricBlotter } from './HistoricBlotter';

const makeDeal = (overrides: Partial<Deal> = {}): Deal => ({
  dealId: 'd_h',
  clientName: 'Acme Corp',
  accountCode: 'ACME-EUR-1',
  pair: 'EURUSD',
  side: 'BUY',
  notional: 1_000_000,
  dealtCcy: 'BASE',
  tenor: 'SPOT',
  defaultMarginPips: 3,
  createdAt: new Date(2026, 4, 25, 14, 23, 0).getTime(),
  ...overrides,
});

const makeHistoricEntry = (overrides: Partial<HistoricEntry> = {}): HistoricEntry => ({
  deal: makeDeal(),
  rejectionReasons: [],
  finalSiState: 'TradeConfirmed',
  finalRfsState: 'TradeConfirmed',
  outcome: 'Executed',
  archivedAt: new Date(2026, 4, 25, 14, 23, 8).getTime(),
  ...overrides,
});

const reset = (): void => useDealsStore.setState({ deals: new Map(), historic: [] });

describe('<HistoricBlotter />', () => {
  beforeEach(reset);
  afterEach(reset);

  it('renders the empty-state message when there are no historic deals', () => {
    render(<HistoricBlotter />);
    expect(screen.getByText('No historic deals yet.')).toBeInTheDocument();
  });

  it('renders one row per historic entry with the correct outcome label', () => {
    useDealsStore.setState({
      deals: new Map(),
      historic: [
        makeHistoricEntry({
          deal: makeDeal({ dealId: 'd_one', clientName: 'Acme Corp' }),
          outcome: 'Executed',
        }),
        makeHistoricEntry({
          deal: makeDeal({ dealId: 'd_two', clientName: 'Halcyon Capital' }),
          outcome: 'Rejected by Trader',
          finalSiState: 'TraderRejected',
        }),
      ],
    });
    render(<HistoricBlotter />);
    const body = screen.getByTestId('historic-blotter-body');
    const rows = within(body).getAllByRole('generic').filter((el) => el.hasAttribute('data-deal-id'));
    expect(rows).toHaveLength(2);
    const one = within(body).getByText('Acme Corp').closest('[data-deal-id]');
    const two = within(body).getByText('Halcyon Capital').closest('[data-deal-id]');
    expect(one).toHaveAttribute('data-outcome', 'Executed');
    expect(two).toHaveAttribute('data-outcome', 'Rejected by Trader');
  });
});
