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
  onReject,
  onRecompute,
  currentVolatility,
}: {
  initialMargin?: number;
  suggestion: MarginSuggestion | null;
  onReject?: () => void;
  onRecompute?: () => void;
  currentVolatility?: number;
}) {
  const [margin, setMargin] = useState(initialMargin);
  return (
    <>
      <SuggestionPanel
        suggestion={suggestion}
        currentMargin={margin}
        onApply={setMargin}
        onReject={onReject}
        onRecompute={onRecompute}
        currentVolatility={currentVolatility}
      />
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

  it('renders nothing when suggestion is null', () => {
    render(<Harness suggestion={null} />);
    expect(screen.queryByTestId('suggestion-panel')).toBeNull();
  });

  describe('credit-decline (FXSW-026)', () => {
    const DECLINE: MarginSuggestion = {
      kind: 'credit-decline',
      rationale: 'Credit limit breach — recommend declining. Suggested action: Reject.',
      computedAt: 1_700_000_000_000,
    };

    it('renders the §7 message + Reject shortcut + data-suggestion-state="credit-decline"; Apply is absent', () => {
      render(<Harness suggestion={DECLINE} onReject={() => undefined} />);
      const panel = screen.getByTestId('suggestion-panel');
      expect(panel).toHaveAttribute('data-suggestion-state', 'credit-decline');
      expect(panel).toHaveTextContent(/Credit limit breach/);
      expect(screen.getByTestId('suggestion-reject')).toBeInTheDocument();
      expect(screen.queryByTestId('suggestion-apply')).toBeNull();
    });

    it('Reject shortcut: single click does nothing; 600ms hold fires onReject', () => {
      const onReject = vi.fn();
      render(<Harness suggestion={DECLINE} onReject={onReject} />);
      const btn = screen.getByTestId('suggestion-reject');
      act(() => {
        fireEvent.pointerDown(btn);
        fireEvent.pointerUp(btn);
      });
      expect(onReject).not.toHaveBeenCalled();
      act(() => {
        fireEvent.pointerDown(btn);
        vi.advanceTimersByTime(600);
      });
      expect(onReject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Recompute (FXSW-026)', () => {
    it('Recompute click flips data-suggestion-state to "computing" then back to "ready" after 800ms, calling onRecompute once', () => {
      const onRecompute = vi.fn();
      render(<Harness suggestion={READY} onRecompute={onRecompute} />);
      const btn = screen.getByTestId('suggestion-recompute');
      act(() => {
        fireEvent.click(btn);
      });
      expect(screen.getByTestId('suggestion-panel')).toHaveAttribute(
        'data-suggestion-state',
        'computing',
      );
      expect(onRecompute).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(onRecompute).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('suggestion-panel')).toHaveAttribute(
        'data-suggestion-state',
        'ready',
      );
    });

    it('multiple rapid Recompute clicks debounce to one onRecompute call', () => {
      const onRecompute = vi.fn();
      render(<Harness suggestion={READY} onRecompute={onRecompute} />);
      const btn = screen.getByTestId('suggestion-recompute');
      act(() => {
        fireEvent.click(btn);
        vi.advanceTimersByTime(300);
        fireEvent.click(btn);
        vi.advanceTimersByTime(300);
        fireEvent.click(btn);
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(onRecompute).toHaveBeenCalledTimes(1);
    });

    it('Apply is disabled while in "computing" state', () => {
      render(<Harness suggestion={READY} onRecompute={() => undefined} />);
      act(() => {
        fireEvent.click(screen.getByTestId('suggestion-recompute'));
      });
      expect(screen.getByTestId('suggestion-apply')).toBeDisabled();
    });

    it('vol shift > 30% from last input triggers recompute', () => {
      const onRecompute = vi.fn();
      const { rerender } = render(
        <Harness suggestion={READY} onRecompute={onRecompute} currentVolatility={1.0} />,
      );
      rerender(
        <Harness suggestion={READY} onRecompute={onRecompute} currentVolatility={1.5} />,
      );
      // 50% jump → triggers recompute → after 800ms, fires.
      expect(screen.getByTestId('suggestion-panel')).toHaveAttribute(
        'data-suggestion-state',
        'computing',
      );
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(onRecompute).toHaveBeenCalledTimes(1);
    });

    it('vol shift ≤ 30% does NOT trigger recompute', () => {
      const onRecompute = vi.fn();
      const { rerender } = render(
        <Harness suggestion={READY} onRecompute={onRecompute} currentVolatility={1.0} />,
      );
      rerender(
        <Harness suggestion={READY} onRecompute={onRecompute} currentVolatility={1.2} />,
      );
      // 20% shift, below 30% threshold → no recompute trigger.
      expect(screen.getByTestId('suggestion-panel')).toHaveAttribute(
        'data-suggestion-state',
        'ready',
      );
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(onRecompute).not.toHaveBeenCalled();
    });
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
