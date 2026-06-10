import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Deal } from '@/types/deal';
import SummaryPanel from './SummaryPanel';

const globex = (): Deal => ({
  dealId: 'd_globex',
  clientName: 'Globex Industries',
  accountCode: 'GLBX-JPY-2',
  pair: 'USDJPY',
  side: 'SELL',
  notional: 5_000_000,
  dealtCcy: 'BASE',
  tenor: 'SPOT',
  defaultMarginPips: 3,
  createdAt: new Date(2026, 4, 18, 14, 23, 8).getTime(), // Mon 18 May 2026
});

describe('<SummaryPanel />', () => {
  it('given Globex SELL 5M USDJPY for SPOT, renders the expected sentence', () => {
    render(<SummaryPanel deal={globex()} />);
    const panel = screen.getByTestId('summary-panel');
    // Normalize whitespace inside the sentence for a stable assertion.
    expect(panel.textContent?.replace(/\s+/g, ' ')).toContain(
      'Client Globex Industries wants to SELL 5,000,000 USD vs JPY for SPOT settlement.',
    );
  });

  it('shows account, trade date, and T+2 settlement date in the key/value strip', () => {
    render(<SummaryPanel deal={globex()} />);
    const panel = screen.getByTestId('summary-panel');
    expect(panel).toHaveTextContent('GLBX-JPY-2');
    expect(panel).toHaveTextContent('18 May 2026');
    expect(panel).toHaveTextContent('20 May 2026'); // T+2 weekdays
  });
});
