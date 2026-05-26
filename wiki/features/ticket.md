---
last_updated: 2026-05-26
sources:
  - docs/02-functional-spec.md
  - docs/03-trade-state-model.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/FXSW-021-summary.md
status: stable
ticket: FXSW-014..FXSW-020
---

# Feature — SI Ticket (Spot)

The right-side overlay panel a trader opens for a single deal. 640px wide on `sm:` and up, full-viewport on mobile per the responsive amendment. Slides in over 240ms with `cubic-bezier(0.16, 1, 0.3, 1)`. Glass background via `bg-bg-glass + backdrop-blur-xl + backdrop-saturate-150`. Blotters dim to `opacity-75` while the ticket is open.

V1 supports the **Spot** ticket type only.

## Panel stack (top to bottom)

| Panel | testid | Source | Ticket |
|---|---|---|---|
| Reasons | `reasons-panel` | `src/features/ticket/ReasonsPanel.tsx` | FXSW-015 |
| Summary | `summary-panel` | `src/features/ticket/SummaryPanel.tsx` | FXSW-016 |
| AI Margin Suggestion | `suggestion-panel` | `src/features/ticket/SuggestionPanel.tsx` | (Phase 4 — see [ai-margin-suggestion.md](ai-margin-suggestion.md)) |
| Pricing | `pricing-panel` | `src/features/ticket/PricingPanel.tsx` | FXSW-017 (streaming), FXSW-018 (fixed + margin) |
| Client Summary | `client-summary-panel` | `src/features/ticket/ClientSummaryPanel.tsx` | FXSW-019 |
| Deal Summary | `deal-summary-panel` | `src/features/ticket/DealSummaryPanel.tsx` | FXSW-016 |
| Footer | `ticket-footer` | `src/features/ticket/TicketFooter.tsx` | FXSW-020 |

## Open / close (FXSW-014)

- **Opens** when the operator clicks a row in SI `Initial` state with `Dealable=true`. The click fires the parent `dealMachine`'s `PickUp` event, which the parent fans into both child machines per [components/deal-machine.md](../components/deal-machine.md).
- The `PickUp` fire is **gated on `siState === 'Initial'`** — re-opening a `PickedUp` deal (operator closed without releasing, clicked the row again) doesn't double-fire.
- **Closes** via `Esc`, clicking outside the panel, or any terminal action.
- Closing without action leaves the deal in its current state. It does **not** auto-Hold/Release. Another trader cannot pick up a `PickedUp` deal — the operator must click Release explicitly to flip `Dealable` back to `true`.
- Conditional mount (not always-mounted-with-CSS-translate) so the testid is absent from DOM when closed. Slide-in via two-pass `requestAnimationFrame` to animate from `translate-x-full` → `translate-x-0`.

## Reasons Panel (FXSW-015)

One chip per `RejectionReason` from the deal's payload. Renders nothing when reasons array is empty.

| Reason | Icon | Label |
|---|---|---|
| `OFF_HOURS` | `Clock` | "Outside trading window" |
| `SIZE_LIMIT` | `Maximize2` | "Notional exceeds auto-pricing band" |
| `CREDIT_LIMIT` | `ShieldAlert` | "Client credit limit would be breached" |

Each chip carries `data-reason="{REASON}"` for test scoping.

## Summary Panel + Deal Summary Panel (FXSW-016)

- **Summary Panel** renders a natural-language sentence (`"Client X wants to BUY/SELL Y BASE vs QUOTE for SPOT settlement."`) plus a three-column key/value strip (Account / Trade date / Settlement date).
- **Deal Summary Panel** renders Direction / Notional / Account / Trade date / Settlement date, each with `data-field="{name}"`.
- T+2 settlement date computed by `src/lib/time.ts` `addBusinessDays(date, 2)`. Skips Sat + Sun. Weekend trade dates roll forward to the next Monday first.

## Pricing Panel — streaming mode (FXSW-017)

- Subscribes to the [pricing feed](../components/pricing-feed.md) via the `usePrice(pair)` hook.
- Bid + Ask cells at `text-2xl font-mono tabular-nums`, Mid between them at smaller dimmer text.
- Each cell carries `data-flash="up" | "down"` on a value change, cleared after 80ms (direction-coloured border).
- Stale-feed watchdog: 3-second `setTimeout` resets on every tick. If it fires, all three cells render the em-dash placeholder.
- Test contract: `data-testid="bid-cell" | "mid-cell" | "ask-cell"`.

## Pricing Panel — fixed mode (FXSW-018)

- Click a bid or ask cell to enter fixed mode for that side. The panel switches to `data-pricing-mode="fixed"` and the clicked cell gets `data-focused="true"`. Cells are real `<button>` elements so keyboard activation (Enter/Space) works.
- Refresh button (`data-testid="refresh-button"`, lucide `RefreshCw`) appears only in fixed mode. Click re-captures the current live tick.
- Margin controls: `data-testid="margin-minus" | "margin-input" | "margin-plus"`. + / − increment / decrement by 1. Numeric input clamps floor at 1; minus button is `disabled` at the floor.
- Keyboard `+` / `=` / `-` / `_` on the document increment/decrement margin. Handler ignores keys typed into an `<input>` (so the operator can type a margin value without the global accelerator firing).
- Indigo glow on margin change: `data-margin-glow="true"` for 600ms on every margin change (internal click, keypress, typed input, or external prop push).
- Tick flash + stale watchdog suppressed in fixed mode — the displayed rate is frozen, so motion would be misleading.

## Client Summary Panel (FXSW-019)

- Three-column grid with one testid per cell: `data-testid="client-bid"`, `data-testid="client-ask"`, `data-testid="estimated-profit"`. Container is `data-testid="client-summary-panel"`.
- All math lives in `src/lib/pips.ts`:
  - `pipSizeFor(pair)` — 0.0001 for 4dp pairs, 0.01 for 2dp JPY/INR pairs.
  - `clientBidFromTrader`, `clientAskFromTrader` — round to the pair's display precision so float drift doesn't leak (`1.0850 − 3*0.0001` is `1.0846999999999998` in raw floats; the lib rounds to 1.0847).
  - `estimatedProfitUsd(margin, notional, pair, midRate)` — handles both quote-side currencies: USD-quoted pairs use the pip value directly; USD-base pairs divide by `midRate` to convert to USD. Zero-rate guard returns 0 so a transient stale feed doesn't crash with `Infinity`.
- Estimated profit formatted as `Intl.NumberFormat` USD currency, zero decimals.
- Null tick → all three cells render the em-dash placeholder.

## Pricing-mode + margin state lifted to TicketPanel

In Phase 3 (post-FXSW-019), `pricingMode`, `fixedSide`, `frozenTick`, and `marginPips` live as TicketPanel state. A single `usePrice(deal.pair)` call at the parent level feeds both PricingPanel and ClientSummaryPanel via `displayTick = pricingMode === 'fixed' ? frozenTick : liveTick`, so both panels freeze and unfreeze together.

This is an interim — FXSW-025 (Phase 4) will lift `marginPips` onto the dealMachine context. See [data-models/deal.md](../data-models/deal.md).

## Footer / Actions (FXSW-020)

Six buttons per `docs/02-functional-spec.md` §4.7. Visibility gated on `siState + pricingMode`.

| Button | testid | Visible when SI ∈ | Fires |
|---|---|---|---|
| Reject | `btn-reject` | `PickedUp`, `Quoted` | `Reject` → `RejectSent` → `TraderRejected`. Hold-to-confirm. |
| Release | `btn-release` | `PickedUp`, `Quoted` | `Hold` → `HoldSent` → `Initial` (Dealable=true). Single click — Release is reversible so doesn't need the hold safety. |
| Send Stream | `btn-send-stream` | `PickedUp`, streaming mode | `Quote` → `QuoteSent` → `Quoted`. Hold-to-confirm. |
| Send Quote | `btn-send-quote` | `PickedUp`, fixed mode | `Quote` with captured rate → `QuoteSent` → `Quoted`. |
| Withdraw | `btn-withdraw` | `Quoted` | `Withdraw` → `WithdrawSent` → `PickedUp`. |
| Return to Stream | `btn-return-stream` | `PickedUp`, fixed mode | Resumes streaming locally; resets `pricingMode` / `fixedSide` / `frozenTick`. |

### Hold-to-confirm + double-click

Reject and Send Stream require **600ms hold** OR **double-click** to fire. Implemented inline as a `HoldButton` primitive in `TicketFooter.tsx`:

- 600ms `setTimeout` on `pointerDown`, cancels on `pointerUp` / `pointerLeave`.
- `onDoubleClick` is the alternative confirm path. Two single clicks (each cancelled) still register as a `dblclick` at the DOM level.
- Visual progress overlay via an inline-styled `<span>` driven by a `holdgrow` keyframe in `global.css`.
- `aria-describedby` hint ("Hold for 600ms or double-click to confirm") per `docs/05` §7 accessibility note.

`HoldButton` is **not** lifted to `src/components/Button.tsx` yet — only two consumers in Phase 3. FXSW-029 (polish) will lift when there's a third.

### `*Sent` window UI

Each action button stays mounted through its `*Sent` window so the spinner renders in-place (same testid, same DOM node, `data-in-flight="true"` + `disabled` + lucide `Loader2` icon with `animate-spin`). Tests can keep a single locator across the full transition.

`onClick` on regular buttons disables when `inFlight` — defensive double-tap guard against fast operators racing the 250ms ack delay.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| `Esc` | Close ticket without action |
| `+` / `=` | Increment margin |
| `-` / `_` | Decrement margin |

(The full `Enter` = Send Stream / `R` = Reject / `M` = mute shortcuts from `docs/02-functional-spec.md` §7 are deferred to later polish.)

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

Per-cell / per-field testids documented in each sub-panel section above. The OFF_HOURS_INTERVENTION E2E ([scenarios/off-hours-intervention.md](../scenarios/off-hours-intervention.md)) is the integration check for the entire panel stack.

## Tests

| File | Cases | Covers |
|---|---|---|
| `src/features/ticket/TicketPanel.test.tsx` | 5 | Not rendered when closed; rendered when open with deal info; Esc closes; opening fires SI `PickUp` (gated on `Initial`); closing does NOT fire `Hold`. |
| `src/features/ticket/ReasonsPanel.test.tsx` | 3 | One chip per reason with the verbatim label; multi-reason render; empty array renders nothing. |
| `src/features/ticket/SummaryPanel.test.tsx` | 2 | Natural-language sentence + key/value strip (account / trade date / settlement). |
| `src/features/ticket/DealSummaryPanel.test.tsx` | 4 | T+2 settlement weekday calc; weekend rollover Thursday→Monday; direction/notional/account/dates rendered. |
| `src/features/ticket/PricingPanel.test.tsx` | 9 | Streaming bid/mid/ask from seed-42 feed; `data-flash="up/down"` 80ms tick flash; stale-feed em-dash; click bid → fixed mode + `data-focused`; Refresh only in fixed mode; +/− and keyboard +/- increment margin; floor at 1; margin-glow animation on programmatic margin change. |
| `src/features/ticket/ClientSummaryPanel.test.tsx` | 5 | EURUSD margin → client bid/ask via pip arithmetic; USDJPY 2-decimal pip; profit reactive to margin; fixed-mode uses captured tick; null tick → em-dash. |
| `src/features/ticket/TicketFooter.test.tsx` | 7 | Visibility per SI state + pricingMode (PickedUp streaming / fixed / Quoted); Reject single-click no-op + 600ms hold fires; Send Stream cycles `QuoteSent → Quoted` via ack delay; `data-in-flight` during `*Sent`; Release cycles `HoldSent → Initial` and flips `dealable`. |
| `src/lib/pips.test.ts` | 9 | `pipSizeFor`, `clientBidFromTrader`, `clientAskFromTrader`, `estimatedProfitUsd` across 4 pairs; JPY 2-decimal asymmetry; zero-rate guard. |
| `src/lib/time.test.ts` | 6 | `addBusinessDays` (Mon/Wed/Thu/Fri/Sat/Sun start); `formatSettlementDate` en-GB `DD MMM YYYY`. |

Hold-to-confirm + double-click pattern: see [components/test-patterns.md](../components/test-patterns.md) §3. Pricing-panel harness pattern: §4. Half-spread rounding caveat for seed-42 tick 1: §1.

## Status

Panel shell, all sub-panels (including the [AI Margin Suggestion](ai-margin-suggestion.md)), and footer are **stable** as of Phase 4 close (FXSW-014–020 + FXSW-025/026). Hand-off between Reasons → Summary → AI Suggestion → Pricing → ClientSummary → DealSummary → Footer is wired end-to-end; the OFF_HOURS / CREDIT_BREACH / SIZE_LIMIT E2Es exercise the full stack.

## Sources

- `docs/02-functional-spec.md` §4 — all sub-sections + §4.8 open/close behaviour
- `docs/03-trade-state-model.md` §2, §3, §7 — SI states, RFS↔SI relationships, side-effect timers
- `docs/05-ui-ux-spec.md` §2, §4, §5 — overlay layout, pricing-panel detail, animation budget
- `docs/phase-summaries/FXSW-021-summary.md` — Phase 3 hand-off summary
- `docs/dev-log.md` FXSW-014 → FXSW-020 — per-ticket implementation notes
