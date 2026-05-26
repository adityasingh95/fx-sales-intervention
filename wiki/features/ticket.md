---
last_updated: 2026-05-26
sources:
  - docs/02-functional-spec.md
  - docs/03-trade-state-model.md
  - docs/05-ui-ux-spec.md
status: in-progress
ticket: FXSW-014
---

# Feature — SI Ticket (Spot)

The right-side overlay panel a trader opens for a single deal. 640px wide, slides in from the right (240ms `cubic-bezier(0.16, 1, 0.3, 1)`), glass background (`--color-bg-glass` + `backdrop-filter: blur(20px) saturate(140%)`). Blotters dim to 75% opacity behind it.

V1 supports the **Spot** ticket type only. Forward / NDF / Flexible Forward / Swap / Block are out of scope (see [overview.md](../overview.md) §What's not).

## Panel stack (top to bottom)

| Panel | Spec section | Notes |
|---|---|---|
| Reasons Panel | `docs/02-functional-spec.md` §4.1 | One chip per rejection reason; always visible. |
| Summary Panel | `docs/02-functional-spec.md` §4.2 | Natural-language one-liner + key/value strip. |
| AI Margin Suggestion Panel | `docs/02-functional-spec.md` §4.3, `docs/09-suggestion-engine.md` | Visible only in `PickedUp`. See [ai-margin-suggestion.md](ai-margin-suggestion.md). |
| Pricing Panel | `docs/02-functional-spec.md` §4.4, `docs/05-ui-ux-spec.md` §4 | Live bid/ask, margin controls, streaming/fixed mode toggle. |
| Client Summaries Panel | `docs/02-functional-spec.md` §4.5 | Read-only preview of what the client sees. |
| Deal Summary Panel | `docs/02-functional-spec.md` §4.6 | Direction, notional, account, trade date, settlement date. |
| Footer / Actions | `docs/02-functional-spec.md` §4.7 | Reject / Release / Send Stream / Send Quote / Withdraw / Return to Stream. |

## Open / close

- **Opens** when the operator clicks a row in SI `Initial` state with `Dealable=true`. The click fires the parent `dealMachine`'s `PickUp` event, which the parent fans into both child machines per [components/deal-machine.md](../components/deal-machine.md).
- **Closes** via `Esc`, clicking outside the panel, or any terminal action.
- Closing without action leaves the deal in its current state (e.g. `PickedUp`). It does **not** auto-Hold/Release. Another trader cannot pick up a `PickedUp` deal — the operator must click Release explicitly to flip `Dealable` back to `true`.

## Pricing modes

The Pricing Panel runs in one of two modes:

- **Streaming (default).** Trader rate boxes update live from the [pricing feed](../components/pricing-feed.md). Margin adjustments are reactive.
- **Fixed.** Triggered by single-clicking the Bid or Ask box. The clicked box highlights; rates freeze; the Refresh button appears. Click `Return to Stream` in the footer to resume.

## Footer-button visibility (gated by SI state)

| Button | Visible when SI ∈ | Fires |
|---|---|---|
| Reject | `PickedUp`, `Quoted` | `Reject` → `RejectSent` → `TraderRejected`. Hold-to-confirm. |
| Release | `PickedUp`, `Quoted` | `Hold` → `HoldSent` → `Initial` with `Dealable=true`. From `Quoted` the live quote is withdrawn on the RFS side as part of the release. |
| Send Stream | `PickedUp`, streaming mode | `Quote` → `QuoteSent` → `Quoted`. Hold-to-confirm. |
| Send Quote | `PickedUp`, fixed mode | `Quote` with captured rate → `QuoteSent` → `Quoted`. |
| Withdraw | `Quoted` | `Withdraw` → `WithdrawSent` → `PickedUp`. |
| Return to Stream | `PickedUp`, fixed mode | Resumes streaming locally; flips the action button back to Send Stream. |

`Reject` and `Send Stream` require 600ms hold or double-click to prevent accidental terminal actions.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| `Esc` | Close ticket without action |
| `+` / `-` | Increment / decrement margin |
| `Enter` | (streaming) Send Stream (with confirm) |
| `R` | Reject (with confirm) |

## Test contract

```html
<aside data-testid="ticket-panel" data-deal-id="d_001">
  <section data-testid="reasons-panel">…</section>
  <section data-testid="summary-panel">…</section>
  <section data-testid="suggestion-panel" data-suggestion-state="ready">…</section>
  <section data-testid="pricing-panel" data-pricing-mode="streaming">…</section>
  <section data-testid="client-summary-panel">…</section>
  <section data-testid="deal-summary-panel">…</section>
  <footer data-testid="ticket-footer">…</footer>
</aside>
```

Buttons: `data-testid="btn-reject"`, `btn-release`, `btn-send-stream`, `btn-send-quote`, `btn-withdraw`, `btn-return-stream`.

## Status

Panel shell + glass overlay is FXSW-014. Per-panel build-out lands in FXSW-015 through FXSW-020. Not yet started — Phase 3.

## Sources

- `docs/02-functional-spec.md` §4 (all sub-sections)
- `docs/03-trade-state-model.md` §2, §3, §7 — SI states, RFS↔SI relationships, side-effect timers
- `docs/05-ui-ux-spec.md` §2, §4, §5 — overlay layout, pricing-panel detail, animation budget
- `docs/BACKLOG.md` FXSW-014 through FXSW-020 — implementation tickets
