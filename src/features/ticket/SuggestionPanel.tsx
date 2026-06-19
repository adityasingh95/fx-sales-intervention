import clsx from 'clsx';
import { AlertTriangle, RotateCw, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { HoldButton } from '@/components/Button';
import type { MarginSuggestion } from '@/services/suggestion/types';

// FXSW-025 ready / applied / Undo · FXSW-026 credit-decline + Recompute.
// Spec: docs/02 §4.3, docs/05 §4.5, docs/09 §7 + §9 + §10 + §13.

const RECOMPUTE_DEBOUNCE_MS = 800;
const VOL_SHIFT_THRESHOLD = 0.3; // 30% relative change triggers recompute

export interface SuggestionPanelProps {
  suggestion: MarginSuggestion | null;
  currentMargin: number;
  // FXSW-039: `onApply` writes the new suggested margin. In v2 the
  // parent translates the single number to both sides of a MarginPair
  // and captures the prior pair for Undo. FXSW-058: for forwards a second
  // arg carries the suggested forward-points margin.
  onApply: (next: number, fwdPips?: number) => void;
  // FXSW-039: optional callback fired by the Undo button. If provided,
  // the parent restores the saved pair (lossless undo in v2). If absent,
  // the panel falls back to calling onApply with the pre-apply margin
  // value (v1 behaviour, single-number restore).
  onUndo?: () => void;
  // FXSW-026: provided by TicketPanel. Recompute click + vol shift fire
  // onRecompute(); credit-decline shortcut fires onReject() which the
  // parent maps to SI Reject (same event the TicketFooter Reject sends).
  onRecompute?: () => void;
  onReject?: () => void;
  currentVolatility?: number;
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
  onUndo,
  onRecompute,
  onReject,
  currentVolatility,
}: SuggestionPanelProps) {
  const [appliedFrom, setAppliedFrom] = useState<number | null>(null);
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const recomputeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVolRef = useRef(currentVolatility);

  const triggerRecompute = (): void => {
    if (recomputeTimer.current) clearTimeout(recomputeTimer.current);
    setRecomputing(true);
    recomputeTimer.current = setTimeout(() => {
      setRecomputing(false);
      recomputeTimer.current = null;
      onRecompute?.();
    }, RECOMPUTE_DEBOUNCE_MS);
  };

  // Vol-shift watch: any change of > 30% relative to the value used at the
  // last recompute fires another (debounced) one. Static in v1 because
  // marketContext returns a constant per pair — see docs/09 §3.1.
  useEffect(() => {
    if (currentVolatility === undefined) return;
    if (lastVolRef.current === undefined) {
      lastVolRef.current = currentVolatility;
      return;
    }
    if (lastVolRef.current === 0) {
      lastVolRef.current = currentVolatility;
      return;
    }
    const ratio = Math.abs(currentVolatility - lastVolRef.current) / lastVolRef.current;
    if (ratio > VOL_SHIFT_THRESHOLD) {
      lastVolRef.current = currentVolatility;
      triggerRecompute();
    }
    // triggerRecompute closes over current onRecompute; the effect dep on
    // currentVolatility is the only relevant signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVolatility]);

  // Clean up the debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (recomputeTimer.current) clearTimeout(recomputeTimer.current);
    };
  }, []);

  // A new suggestion (different deal, recompute) resets internal state so
  // the trader sees the new recommendation and can act on it. The
  // recomputing flag is not reset here — its own timer drives it so the
  // shimmer remains visible across the full debounce window even if the
  // parent has already swapped the suggestion.
  useEffect(() => {
    setAppliedFrom(null);
    setWhyExpanded(false);
  }, [suggestion]);

  if (!suggestion) return null;

  if (suggestion.kind === 'credit-decline') {
    return (
      <section
        data-testid="suggestion-panel"
        data-suggestion-state="credit-decline"
        aria-label="AI Recommendation"
        className="flex flex-col gap-3 rounded-xl border border-ai-border bg-ai-bg p-4 backdrop-blur-md backdrop-saturate-[180%] shadow-[0_2px_12px_rgba(0,122,255,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]"
      >
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-ai-accent" aria-hidden />
            <span className="text-sm font-medium text-text">AI Recommendation</span>
          </div>
          <AlertTriangle size={14} className="text-amber" aria-hidden />
        </header>
        <p className="text-sm leading-base text-text-dim">{suggestion.rationale}</p>
        <div className="self-start">
          <HoldButton
            testId="suggestion-reject"
            onConfirm={() => onReject?.()}
            variant="danger"
          >
            Reject deal
          </HoldButton>
        </div>
      </section>
    );
  }

  const handleApply = (): void => {
    setAppliedFrom(currentMargin);
    if (suggestion.fwdPointsPips !== undefined) {
      onApply(suggestion.suggestedPips, suggestion.fwdPointsPips);
    } else {
      onApply(suggestion.suggestedPips);
    }
  };
  const handleUndo = (): void => {
    if (appliedFrom === null) return;
    // v2 path: parent owns the saved pair and restores it losslessly.
    // v1 path: fall back to restoring the single captured value.
    if (onUndo) {
      onUndo();
    } else {
      onApply(appliedFrom);
    }
    setAppliedFrom(null);
  };

  const isApplied = appliedFrom !== null;

  if (isApplied && !recomputing) {
    return (
      <section
        data-testid="suggestion-panel"
        data-suggestion-state="applied"
        className="flex items-center justify-between gap-3 rounded-xl border border-ai-border bg-ai-bg px-4 py-2.5 backdrop-blur-md backdrop-saturate-[180%] shadow-[0_2px_12px_rgba(0,122,255,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-ai-accent" aria-hidden />
          <span className="text-sm text-text">
            Applied {suggestion.suggestedPips}
            {suggestion.fwdPointsPips !== undefined
              ? ` + ${suggestion.fwdPointsPips} fwd`
              : ''}{' '}
            pips
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
      data-suggestion-state={recomputing ? 'computing' : 'ready'}
      aria-label="AI Margin Suggestion"
      aria-busy={recomputing || undefined}
      className="flex flex-col gap-3 rounded-xl border border-ai-border bg-ai-bg p-4 backdrop-blur-md backdrop-saturate-[180%] shadow-[0_2px_12px_rgba(0,122,255,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-ai-accent" aria-hidden />
          <span className="text-sm font-medium text-text">AI Margin Suggestion</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="suggestion-confidence"
            className={clsx(
              'rounded-sm px-2 py-0.5 text-[10px] font-medium uppercase tracking-tight',
              CONFIDENCE_CLASS[suggestion.confidence],
            )}
          >
            {CONFIDENCE_LABEL[suggestion.confidence]}
          </span>
          <button
            type="button"
            data-testid="suggestion-recompute"
            aria-label="Recompute suggestion"
            onClick={triggerRecompute}
            disabled={recomputing}
            className="rounded-sm p-1 text-text-mute transition-colors hover:text-ai-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCw
              size={14}
              className={clsx(recomputing && 'animate-spin')}
              aria-hidden
            />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        {recomputing ? (
          <>
            <div
              className="h-8 w-24 animate-pulse rounded bg-bg-elevated"
              aria-hidden
            />
            <p className="text-sm leading-base text-text-mute">Recomputing…</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span
                data-testid="suggestion-pips"
                className="font-mono text-2xl font-semibold text-text"
              >
                {suggestion.suggestedPips}
              </span>
              <span className="text-xs font-normal text-text-mute">
                {suggestion.fwdPointsPips !== undefined ? 'spot pips' : 'pips'}
              </span>
              {suggestion.fwdPointsPips !== undefined && (
                <span
                  data-testid="suggestion-fwd-pips"
                  className="text-xs font-normal text-text-mute"
                >
                  · +{suggestion.fwdPointsPips} fwd pips
                </span>
              )}
            </div>
            <p
              data-testid="suggestion-rationale"
              className="text-sm leading-base text-text-dim"
            >
              {suggestion.rationale}
            </p>
          </>
        )}
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
          disabled={recomputing}
          className="rounded-sm bg-ai-accent px-3 py-1.5 text-xs font-semibold text-bg-app transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply
        </button>
        <button
          type="button"
          data-testid="suggestion-why"
          onClick={() => setWhyExpanded((v) => !v)}
          disabled={recomputing}
          className="rounded-sm px-2 py-1.5 text-xs font-medium text-text-dim transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          {whyExpanded ? 'Hide' : 'Why?'}
        </button>
      </div>
    </section>
  );
}
