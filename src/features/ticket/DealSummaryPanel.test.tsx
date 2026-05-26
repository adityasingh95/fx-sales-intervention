import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Deal } from '@/types/deal';
import DealSummaryPanel from './DealSummaryPanel';

const dealAt = (date: Date): Deal => ({
  dealId: 'd_test',
  clientName: 'Acme Corp',
  accountCode: 'ACME-EUR-1',
  pair: 'EURUSD',
  side: 'BUY',
  notional: 1_000_000,
  tenor: 'SPOT',
  defaultMarginPips: 3,
  createdAt: date.getTime(),
});

describe('<DealSummaryPanel />', () => {
  it('settlement date is T+2 weekdays from a Monday trade date', () => {
    const monday = new Date(2026, 4, 18); // Mon 18 May 2026
    render(<DealSummaryPanel deal={dealAt(monday)} />);
    const settlement = screen.getByTestId('deal-summary-panel').querySelector(
      '[data-field="settlement-date"] dd',
    );
    expect(settlement).toHaveTextContent('20 May 2026'); // Wed
  });

  it('handles weekend trade-date rollover correctly (Thursday → Monday)', () => {
    const thursday = new Date(2026, 4, 21); // Thu 21 May 2026
    render(<DealSummaryPanel deal={dealAt(thursday)} />);
    const settlement = screen.getByTestId('deal-summary-panel').querySelector(
      '[data-field="settlement-date"] dd',
    );
    expect(settlement).toHaveTextContent('25 May 2026'); // Mon (skips Sat 23 + Sun 24)
  });

  it('handles Friday → Tuesday rollover (skips Sat + Sun)', () => {
    const friday = new Date(2026, 4, 22); // Fri 22 May 2026
    render(<DealSummaryPanel deal={dealAt(friday)} />);
    const settlement = screen.getByTestId('deal-summary-panel').querySelector(
      '[data-field="settlement-date"] dd',
    );
    expect(settlement).toHaveTextContent('26 May 2026'); // Tue
  });

  it('renders direction with base CCY and the notional', () => {
    const monday = new Date(2026, 4, 18);
    render(<DealSummaryPanel deal={dealAt(monday)} />);
    const panel = screen.getByTestId('deal-summary-panel');
    expect(
      panel.querySelector('[data-field="direction"] dd'),
    ).toHaveTextContent('BUY EUR');
    expect(panel.querySelector('[data-field="notional"] dd')).toHaveTextContent(
      '1,000,000 EUR',
    );
  });
});
