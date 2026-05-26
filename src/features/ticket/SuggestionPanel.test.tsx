import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type {
  MarginSuggestion,
  ReadySuggestion,
} from '@/services/suggestion/types';
import SuggestionPanel from './SuggestionPanel';
import PricingPanel from './PricingPanel';

const READY: ReadySuggestion = {
  kind: 'ready',
  suggestedPips: 4,
  confidence: 'high',
  rationale: 'Gold-tier client with strong recent acceptance, 12M EURUSD, above auto-pricer band — suggesting 4 pips.',
  factors: [
    { name: 'Client tier', delta: 0, note: 'gold client baseline 2 pips' },
    { name: 'Notional size', delta: 1.5, note: '10–20M USD-equivalent' },
    { name: 'Size band breach', delta: 0.5, note: 'Above auto-pricer band — manual margin' },
    { name: 'VIP volume', delta: -0.5, note: 'Top-10 client by volume — preferred pricing' },
  ],
  computedAt: 1_700_000_000_000,
};

function Harness({
  initialMargin = 3,
  suggestion,
}: {
  initialMargin?: number;
  suggestion: MarginSuggestion | null;
}) {
  const [margin, setMargin] = useState(initialMargin);
  return (
    <>
      <SuggestionPanel suggestion={suggestion} currentMargin={margin} onApply={setMargin} />
      <div data-testid="current-margin">{margin}</div>
    </>
  );
}

// Smaller integration harness — wires SuggestionPanel + PricingPanel so the
// Apply → margin-glow contract can be asserted end-to-end.
function MarginGlowHarness({ suggestion }: { suggestion: MarginSuggestion }) {
  const [margin, setMargin] = useState(3);
  return (
    <>
      <SuggestionPanel suggestion={suggestion} currentMargin={margin} onApply={setMargin} />
      <PricingPanel
        pair="EURUSD"
        liveTick={{ pair: 'EURUSD', bid: 1.1714, ask: 1.1716, mid: 1.1715, timestamp: 1 }}
        frozenTick={null}
        pricingMode="streaming"
        fixedSide={null}
        margin={margin}
        onMarginChange={setMargin}
        onEnterFixed={() => undefined}
        onRefresh={() => undefined}
      />
    </>
  );
}

describe('<SuggestionPanel />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders pips, rationale, and confidence badge in the ready state', () => {
    render(<Harness suggestion={READY} />);
    const panel = screen.getByTestId('suggestion-panel');
    expect(panel).toHaveAttribute('data-suggestion-state', 'ready');
    expect(screen.getByTestId('suggestion-pips')).toHaveTextContent('4');
    expect(screen.getByTestId('suggestion-rationale')).toHaveTextContent(
      /above auto-pricer band/,
    );
    expect(screen.getByTestId('suggestion-confidence')).toHaveTextContent(/high/i);
  });

  it('Apply click switches data-suggestion-state to "applied" and updates current margin to the suggested value', () => {
    render(<Harness initialMargin={3} suggestion={READY} />);
    act(() => {
      fireEvent.click(screen.getByTestId('suggestion-apply'));
    });
    expect(screen.getByTestId('current-margin')).toHaveTextContent('4');
    const panel = screen.getByTestId('suggestion-panel');
    expect(panel).toHaveAttribute('data-suggestion-state', 'applied');
    expect(panel).toHaveTextContent(/Applied 4 pips/);
    // Apply + Why? are gone in the applied strip; Undo is the only action.
    expect(screen.queryByTestId('suggestion-apply')).toBeNull();
    expect(screen.queryByTestId('suggestion-why')).toBeNull();
    expect(screen.getByTestId('suggestion-undo')).toBeInTheDocument();
  });

  it('Undo restores the previous margin and switches the panel back to "ready"', () => {
    render(<Harness initialMargin={3} suggestion={READY} />);
    act(() => {
      fireEvent.click(screen.getByTestId('suggestion-apply'));
    });
    expect(screen.getByTestId('current-margin')).toHaveTextContent('4');
    act(() => {
      fireEvent.click(screen.getByTestId('suggestion-undo'));
    });
    expect(screen.getByTestId('current-margin')).toHaveTextContent('3');
    expect(screen.getByTestId('suggestion-panel')).toHaveAttribute(
      'data-suggestion-state',
      'ready',
    );
    expect(screen.getByTestId('suggestion-apply')).toBeInTheDocument();
  });

  it('Why? click reveals the factors table; second click hides it', () => {
    render(<Harness suggestion={READY} />);
    expect(screen.queryByTestId('suggestion-factors')).toBeNull();
    act(() => {
      fireEvent.click(screen.getByTestId('suggestion-why'));
    });
    const table = screen.getByTestId('suggestion-factors');
    expect(table).toBeInTheDocument();
    // Each non-tier factor row renders.
    expect(table).toHaveTextContent(/Notional size/);
    expect(table).toHaveTextContent(/Size band breach/);
    act(() => {
      fireEvent.click(screen.getByTestId('suggestion-why'));
    });
    expect(screen.queryByTestId('suggestion-factors')).toBeNull();
  });

  it('Apply triggers data-margin-glow on the PricingPanel margin input', () => {
    render(<MarginGlowHarness suggestion={READY} />);
    expect(screen.getByTestId('margin-input')).not.toHaveAttribute('data-margin-glow');
    act(() => {
      fireEvent.click(screen.getByTestId('suggestion-apply'));
    });
    expect(screen.getByTestId('margin-input')).toHaveAttribute('data-margin-glow', 'true');
    // Animation clears after 600ms (PricingPanel GLOW_MS).
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByTestId('margin-input')).not.toHaveAttribute('data-margin-glow');
  });

  it('renders nothing for a credit-decline suggestion (FXSW-026 implements the credit-decline UI)', () => {
    const decline: MarginSuggestion = {
      kind: 'credit-decline',
      rationale: 'Credit limit breach — recommend declining. Suggested action: Reject.',
      computedAt: 1_700_000_000_000,
    };
    render(<Harness suggestion={decline} />);
    expect(screen.queryByTestId('suggestion-panel')).toBeNull();
  });

  it('renders nothing when suggestion is null', () => {
    render(<Harness suggestion={null} />);
    expect(screen.queryByTestId('suggestion-panel')).toBeNull();
  });

  it('resets internal applied/why state when the suggestion prop changes', () => {
    const { rerender } = render(<Harness suggestion={READY} />);
    act(() => {
      fireEvent.click(screen.getByTestId('suggestion-apply'));
    });
    expect(screen.getByTestId('suggestion-panel')).toHaveAttribute(
      'data-suggestion-state',
      'applied',
    );
    const newSuggestion: ReadySuggestion = { ...READY, suggestedPips: 7, computedAt: 1_700_000_000_001 };
    rerender(<Harness suggestion={newSuggestion} />);
    expect(screen.getByTestId('suggestion-panel')).toHaveAttribute(
      'data-suggestion-state',
      'ready',
    );
    expect(screen.getByTestId('suggestion-pips')).toHaveTextContent('7');
  });
});
