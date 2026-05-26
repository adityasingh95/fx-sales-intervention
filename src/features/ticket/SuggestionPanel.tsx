import clsx from 'clsx';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MarginSuggestion } from '@/services/suggestion/types';

// FXSW-025 ready / applied / Undo. Credit-decline + Recompute land in FXSW-026.
// Spec: docs/02 §4.3, docs/05 §4.5, docs/09 §10 + §13.

export interface SuggestionPanelProps {
  suggestion: MarginSuggestion | null;
  currentMargin: number;
  onApply: (next: number) => void;
}

const CONFIDENCE_CLASS: Record<'low' | 'medium' | 'high', string> = {
  high: 'text-ai-accent bg-ai-bg',
  medium: 'text-text-dim bg-bg-elevated',
  low: 'text-amber border border-dotted border-amber/60',
};

const CONFIDENCE_LABEL: Record<'low' | 'medium' | 'high', string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

export default function SuggestionPanel({
  suggestion,
  currentMargin,
  onApply,
}: SuggestionPanelProps) {
  const [appliedFrom, setAppliedFrom] = useState<number | null>(null);
  const [whyExpanded, setWhyExpanded] = useState(false);

  // A new suggestion (different deal, recompute) resets internal state so
  // the trader sees the new recommendation and can act on it.
  useEffect(() => {
    setAppliedFrom(null);
    setWhyExpanded(false);
  }, [suggestion]);

  if (!suggestion) return null;
  // FXSW-026 replaces this branch with the credit-decline UI.
  if (suggestion.kind === 'credit-decline') return null;

  const handleApply = (): void => {
    setAppliedFrom(currentMargin);
    onApply(suggestion.suggestedPips);
  };
  const handleUndo = (): void => {
    if (appliedFrom !== null) {
      onApply(appliedFrom);
      setAppliedFrom(null);
    }
  };

  const isApplied = appliedFrom !== null;

  if (isApplied) {
    return (
      <section
        data-testid="suggestion-panel"
        data-suggestion-state="applied"
        className="flex items-center justify-between gap-3 rounded-lg border border-ai-border bg-ai-bg px-4 py-2.5 shadow-ai"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-ai-accent" aria-hidden />
          <span className="text-sm text-text">
            Applied {suggestion.suggestedPips} pips
          </span>
        </div>
        <button
          type="button"
          data-testid="suggestion-undo"
          onClick={handleUndo}
          className="text-xs font-medium text-ai-accent transition-opacity hover:opacity-80"
        >
          Undo
        </button>
      </section>
    );
  }

  return (
    <section
      data-testid="suggestion-panel"
      data-suggestion-state="ready"
      aria-label="AI Margin Suggestion"
      className="flex flex-col gap-3 rounded-lg border border-ai-border bg-ai-bg p-4 shadow-ai"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-ai-accent" aria-hidden />
          <span className="text-sm font-medium text-text">AI Margin Suggestion</span>
        </div>
        <span
          data-testid="suggestion-confidence"
          className={clsx(
            'rounded-sm px-2 py-0.5 text-[10px] font-medium uppercase tracking-tight',
            CONFIDENCE_CLASS[suggestion.confidence],
          )}
        >
          {CONFIDENCE_LABEL[suggestion.confidence]}
        </span>
      </header>

      <div className="flex flex-col gap-2">
        <div
          data-testid="suggestion-pips"
          className="font-mono text-2xl font-semibold text-text"
        >
          {suggestion.suggestedPips}
          <span className="ml-2 text-xs font-normal text-text-mute">pips</span>
        </div>
        <p
          data-testid="suggestion-rationale"
          className="text-sm leading-base text-text-dim"
        >
          {suggestion.rationale}
        </p>
      </div>

      {whyExpanded && (
        <table
          data-testid="suggestion-factors"
          className="w-full table-fixed border-collapse text-xs"
        >
          <thead>
            <tr className="text-text-mute">
              <th className="w-1/3 px-2 py-1 text-left font-medium uppercase tracking-tight">
                Factor
              </th>
              <th className="w-16 px-2 py-1 text-right font-medium uppercase tracking-tight">
                Δ pips
              </th>
              <th className="px-2 py-1 text-left font-medium uppercase tracking-tight">
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            {suggestion.factors.map((f) => (
              <tr key={f.name} className="border-t border-border">
                <td className="px-2 py-1 text-text">{f.name}</td>
                <td className="px-2 py-1 text-right font-mono text-text-dim">
                  {f.name === 'Client tier'
                    ? 'baseline'
                    : `${f.delta > 0 ? '+' : ''}${f.delta}`}
                </td>
                <td className="px-2 py-1 text-text-dim">{f.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="suggestion-apply"
          onClick={handleApply}
          className="rounded-sm bg-ai-accent px-3 py-1.5 text-xs font-semibold text-bg-app transition-opacity hover:opacity-90"
        >
          Apply
        </button>
        <button
          type="button"
          data-testid="suggestion-why"
          onClick={() => setWhyExpanded((v) => !v)}
          className="rounded-sm px-2 py-1.5 text-xs font-medium text-text-dim transition-colors hover:text-text"
        >
          {whyExpanded ? 'Hide' : 'Why?'}
        </button>
      </div>
    </section>
  );
}
