---
last_updated: 2026-05-26
sources:
  - docs/02-functional-spec.md
  - docs/05-ui-ux-spec.md
  - docs/09-suggestion-engine.md
  - docs/phase-summaries/FXSW-027-summary.md
status: stable
ticket: FXSW-025..FXSW-026
---

# Feature — AI Margin Suggestion

The visual moment of the [ticket](ticket.md). Sits between the Reasons Panel and the Summary Panel (per `docs/09-suggestion-engine.md` §2). A recommended margin in pips with a one-line rationale and an Apply button. Visible when SI state = `PickedUp`; hidden in any other state.

Powered by a **deterministic rule engine** — see [components/suggestion-engine.md](../components/suggestion-engine.md) and [decisions/ADR-0006-deterministic-suggestion-engine.md](../decisions/ADR-0006-deterministic-suggestion-engine.md). The "AI" label is real-trader vernacular; the implementation is a pure function. No external API calls.

## Visual treatment

Distinct from the trading chrome via:

- Subtle indigo wash background (`--color-ai-bg`, 8% opacity).
- 1px indigo-accent border (`--color-ai-border`).
- Sparkle icon (`Sparkles` from `lucide-react`) at top-left in `--color-ai-accent`.
- Subtle indigo glow shadow (`--shadow-ai`).
- The indigo/violet accent family is **reserved exclusively for AI surfaces** — see [decisions/ADR-0008-ai-indigo-accent.md](../decisions/ADR-0008-ai-indigo-accent.md).

## Layout — ready state

- **Header row:** sparkle icon + "AI Margin Suggestion" + confidence badge (`Low` / `Medium` / `High`) + a Recompute icon button (`RotateCw`).
- **Body:** large number — the suggested pips at `--text-2xl` (32px) mono — plus short rationale (≤ 120 chars) at `--text-base`. The number and the "pips" unit suffix live in **sibling spans** (not the same div) so `data-testid="suggestion-pips"` scopes to the number only — caught during FXSW-027 debug; see `docs/dev-log.md` entry.
- **Footer:** **Apply** (primary CTA, indigo background) + **Why?** (ghost button).
- **Expanded "Why?" state:** a 3-column factors table (Factor / Δ pips / Note). The tier row shows `baseline` instead of `+0` — the tier is the starting point, not an adjustment.

Confidence badge color-coding per `docs/05-ui-ux-spec.md` §4.5:
- High → `ai-accent` text on `ai-bg`.
- Medium → `text-dim` on `bg-elevated`.
- Low → `amber` text with dotted border.

## Layout — applied state

```
✦  Applied 4 pips                                  [Undo]
```

Collapses to a single-line confirmation strip on the same indigo chrome. State held as `appliedFrom: number | null` — presence means "applied," and the stored value is what Undo restores (avoids an "applied but previousMargin missing" impossible state). Undo restores the previous margin and re-expands the panel.

## Layout — credit-decline state

```
✦  AI Recommendation                              ⚠
─────────────────────────────────────────────────
Credit limit breach — recommend declining. Suggested action: Reject.

[  Reject deal  ]
```

Shown when `rejectionReasons` includes `CREDIT_LIMIT`. Red/40 chrome + amber `AlertTriangle` icon. The Apply button is **replaced** with a `RejectHoldButton` (600ms hold or double-click) that fires the same SI `Reject` event as the [ticket footer](ticket.md). Apply is hidden. Rationale: [decisions/ADR-0007-credit-breach-recommend-decline.md](../decisions/ADR-0007-credit-breach-recommend-decline.md).

The rationale text comes from `CREDIT_DECLINE_RATIONALE` in `src/services/suggestion/rationale.ts` — same constant the [engine](../components/suggestion-engine.md) returns.

## Layout — computing state

The suggested-pips number is replaced with a `bg-elevated` pulse skeleton. The rationale shows "Recomputing…" in `--color-text-mute`. Apply + Why? are disabled. Shown during the 800ms debounce after a Recompute trigger.

## Behaviour

- **Initial computation** fires when SI reaches `PickedUp`. Computed exactly once per PickedUp visit, gated by a `useRef` flag in TicketPanel. Flag clears when SI leaves PickedUp so re-entry (after Withdraw) recomputes.
- **Recompute triggers**: explicit Recompute icon click; `pairVolatility` prop change > 30% from the value used for the last computation.
- Debounced at 800ms — rapid clicks / vol-shift events coalesce into one recompute.
- **Vol-shift is dormant in v1.** `marketContext.ts` returns constants per pair — wiring exists for v2 per `docs/09 §3.1`.
- **Apply** sets `marginPips` on TicketPanel state (interim) — to be lifted onto the dealMachine context in a future polish ticket. The Pricing Panel's margin field animates to the new value with a brief indigo outline glow that fades over 600ms (`data-margin-glow="true"` for 600ms on the margin input; the `MarginGlowHarness` integration test in `SuggestionPanel.test.tsx` verifies the wire).

## Test contract

```html
<section data-testid="suggestion-panel" data-suggestion-state="ready">
  <button data-testid="suggestion-recompute">…</button>
  <div data-testid="suggestion-confidence">high</div>
  <span data-testid="suggestion-pips">4</span>
  <p data-testid="suggestion-rationale">Gold-tier client with 12M EURUSD…</p>
  <button data-testid="suggestion-apply">Apply</button>
  <button data-testid="suggestion-why">Why?</button>
  <!-- Why? expanded: -->
  <table data-testid="suggestion-factors">…</table>
</section>

<!-- applied state -->
<section data-testid="suggestion-panel" data-suggestion-state="applied">
  <button data-testid="suggestion-undo">Undo</button>
</section>

<!-- credit-decline state -->
<section data-testid="suggestion-panel" data-suggestion-state="credit-decline">
  <p data-testid="suggestion-rationale">Credit limit breach…</p>
  <button data-testid="suggestion-reject">Reject deal</button>
</section>
```

`data-suggestion-state` values: `computing`, `ready`, `applied`, `credit-decline`.

The `suggestion-pips` testid scopes to the number-only span; the "pips" unit label is a sibling span outside that testid (so `toHaveText('4')` is unambiguous — the FXSW-027 debug detour fixed this).

## Tests

`src/features/ticket/SuggestionPanel.test.tsx` — **14 cases**. Ready state renders pips + rationale + confidence from mocked engine output (per `docs/09 §13`); Apply switches `data-suggestion-state="applied"` and updates margin; Undo restores previous margin + flips back to `ready`; Why? toggles factor table; **`MarginGlowHarness` integration test** wires SuggestionPanel + PricingPanel and proves Apply triggers `data-margin-glow` on the margin input for 600ms (the indigo outline animation from `docs/05 §4.5`); credit-decline state renders Reject shortcut + no Apply; recompute icon → 800ms `computing` state → re-rendered ready; vol-shift > 30% triggers recompute; null suggestion + new-suggestion-prop reset cases.

Engine-side tests (34 unit + 7 rationale + 6 clientProfiles cases): see [components/suggestion-engine.md](../components/suggestion-engine.md) §Tests.

End-to-end coverage: [scenarios/credit-breach.md](../scenarios/credit-breach.md) (credit-decline path), [scenarios/size-limit-margin-tune.md](../scenarios/size-limit-margin-tune.md) (Apply path).

Harness pattern for the cross-component glow assertion: see [components/test-patterns.md](../components/test-patterns.md) §4. Pips-span testid scoping: §8.

## Implementation commits

| Ticket | Commit | What |
|---|---|---|
| FXSW-025 | `301aac1` | `SuggestionPanel.tsx` ready / applied / Undo / Why? states; `MarginGlowHarness` integration test for Apply → margin glow wire |
| FXSW-026 | `a7cd0fd` | credit-decline state with `RejectHoldButton`; Recompute icon + 800ms debounced computing state; vol-shift recompute hook (v2-dormant) |
| FXSW-027 | `ab8cd30` | E2E specs — `tests/e2e/credit-breach.spec.ts` (7.3s) + `tests/e2e/size-limit-margin-tune.spec.ts` (9.2s) |

## Known interim

- `RejectHoldButton` (in `SuggestionPanel.tsx`) and `HoldButton` (in `TicketFooter.tsx`) are structural duplicates. The lift to a shared `src/components/Button.tsx` with a `holdToConfirm` prop is FXSW-029 polish scope (per `docs/05-ui-ux-spec.md` §3.1).
- `marginPips` lives on TicketPanel state, not the dealMachine context. See [data-models/deal.md](../data-models/deal.md) §Related-fields-stored-elsewhere.

## Sources

- `docs/02-functional-spec.md` §4.3 — panel position, visibility, apply behaviour
- `docs/05-ui-ux-spec.md` §4.5 — visual treatment, layout sketches
- `docs/09-suggestion-engine.md` (all sections) — engine, inputs, outputs, credit-decline, reactivity
- `docs/phase-summaries/FXSW-027-summary.md`
- `docs/dev-log.md` FXSW-025, FXSW-026, FXSW-027 — implementation notes
