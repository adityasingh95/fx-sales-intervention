---
last_updated: 2026-05-26
sources:
  - docs/02-functional-spec.md
  - docs/05-ui-ux-spec.md
  - docs/09-suggestion-engine.md
status: in-progress
ticket: FXSW-025
---

# Feature — AI Margin Suggestion

The visual moment of the [ticket](ticket.md). Sits between the Reasons Panel and the Pricing Panel. A recommended margin in pips with a one-line rationale and an Apply button. Visible when SI state = `PickedUp`; hidden once a quote is sent or any terminal action is taken.

Powered by a **deterministic rule engine** — see [components/suggestion-engine.md](../components/suggestion-engine.md) and [decisions/ADR-0006-deterministic-suggestion-engine.md](../decisions/ADR-0006-deterministic-suggestion-engine.md). The "AI" label is real-trader vernacular; the implementation is a pure function. No external API calls.

## Visual treatment

Distinct from the trading chrome via:

- Subtle indigo wash background (`--color-ai-bg`, 8% opacity).
- 1px indigo-accent border (`--color-ai-border`).
- Sparkle icon (`Sparkles` from `lucide-react`) at top-left in `--color-ai-accent`.
- Subtle indigo glow shadow (`--shadow-ai`).
- The indigo/violet accent family is **reserved exclusively for AI surfaces** — see [decisions/ADR-0008-ai-indigo-accent.md](../decisions/ADR-0008-ai-indigo-accent.md).

## Layout — ready state

- **Header row:** sparkle icon + "AI Margin Suggestion" + confidence badge (`Low` / `Medium` / `High`) + a small Recompute icon button.
- **Body:** large number — the suggested pips at `--text-2xl` (32px) mono — plus short rationale (≤ 120 chars) at `--text-base`.
- **Footer:** **Apply** (primary CTA, indigo background) + **Why?** (ghost button).
- **Expanded "Why?" state:** a small factors table showing each contributing factor, its delta in pips, and a brief note.

## Layout — applied state

```
✦  Applied 4 pips                                  [Undo]
```

Collapses to a single-line confirmation strip. Undo restores the previous margin and re-expands the panel.

## Layout — credit-decline state

```
✦  AI Recommendation                              ⚠
─────────────────────────────────────────────────
Credit limit breach — recommend declining.

[  Reject deal  ]
```

Shown when `rejectionReasons` includes `CREDIT_LIMIT`. The Apply button is **replaced** with a Reject shortcut that fires the same SI `Reject` event as the [ticket footer](ticket.md). Apply is hidden. Rationale: [decisions/ADR-0007-credit-breach-recommend-decline.md](../decisions/ADR-0007-credit-breach-recommend-decline.md).

## Layout — computing state

The suggested-pips number is replaced with a shimmer skeleton (`--color-bg-elevated`, 1.2s shimmer loop). The rationale shows "Recomputing…" in `--color-text-mute`. Apply is disabled. Shown during the 800ms debounce after a recompute trigger.

## Behaviour

- **Initial computation** happens within 800ms of `PickedUp`.
- **Recomputes** trigger on: `pairVolatility` shift > 30% from last input; explicit Recompute button click. Debounced at 800ms.
- **Apply** sets `marginPips` on the deal context to the suggested value. The Pricing Panel's margin field animates to the new value over 200ms with a brief indigo outline glow that fades over 600ms.
- **Undo** restores the previous margin and re-expands the panel.

## Apply propagation

Apply does not just update the margin number — it propagates through the entire pricing chain:

1. `marginPips` updates in the dealMachine context.
2. The Pricing Panel margin field animates to the new value with the indigo outline animation.
3. The Client Summary recalculates client bid / client ask / estimated profit live.
4. The Apply event is recorded in `context.history` for the test contract.

## Test contract

```html
<section data-testid="suggestion-panel" data-suggestion-state="ready">
  <div data-testid="suggestion-pips">4</div>
  <div data-testid="suggestion-confidence">high</div>
  <p data-testid="suggestion-rationale">Gold-tier client with 12M EURUSD…</p>
  <button data-testid="suggestion-apply">Apply</button>
  <button data-testid="suggestion-why">Why?</button>
</section>
```

`data-suggestion-state` values: `computing`, `ready`, `applied`, `credit-decline`.

## Status

Phase 4 work. Engine + panel landing in FXSW-022 through FXSW-026. Not yet implemented. The [size-limit-margin-tune.md](../scenarios/size-limit-margin-tune.md) and [credit-breach.md](../scenarios/credit-breach.md) E2Es (FXSW-027) are the validation gates.

## Sources

- `docs/02-functional-spec.md` §4.3 — panel position, visibility, apply behaviour
- `docs/05-ui-ux-spec.md` §4.5 — visual treatment, layout sketches
- `docs/09-suggestion-engine.md` (all sections) — engine, inputs, outputs, credit-decline, reactivity
- `docs/BACKLOG.md` FXSW-025, FXSW-026 — implementation tickets
