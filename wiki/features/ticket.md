---
last_updated: 2026-06-16
sources:
  - docs/02-functional-spec.md
  - docs/03-trade-state-model.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/FXSW-021-summary.md
  - docs/phase-summaries/FXSW-042-followup-summary.md
  - docs/phase-summaries/phase-08-v3-summary.md
  - docs/phase-summaries/phase-10-ndf-summary.md
  - docs/phase-summaries/phase-11-swaps-summary.md
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
- Refresh button (`data-testid="refresh-button"`, lucide `RefreshCw`) is **always rendered** and `disabled` outside fixed mode (`disabled={pricingMode !== 'fixed'}` + `disabled:opacity-40 disabled:cursor-not-allowed`). In fixed mode, clicking re-captures the current live tick. Phase 6.1 dropped the earlier `pricingMode === 'fixed' &&` mount gate so the button always reserves layout space — selecting a side no longer causes a vertical jump. (The earlier FXSW-018 "appears only in fixed mode" contract is superseded; `PricingPanel.test.tsx` was updated to assert always-rendered-disabled-in-streaming.)
- Margin controls: `data-testid="margin-minus" | "margin-input" | "margin-plus"`. + / − increment / decrement by 1. Numeric input clamps floor at 1; minus button is `disabled` at the floor.
- Keyboard `+` / `=` / `-` / `_` on the document increment/decrement margin. Handler ignores keys typed into an `<input>` (so the operator can type a margin value without the global accelerator firing).
- Indigo glow on margin change: `data-margin-glow="true"` for 600ms on every margin change (internal click, keypress, typed input, or external prop push).
- Tick flash + stale watchdog suppressed in fixed mode — the displayed rate is frozen, so motion would be misleading.

## Pricing Panel — dual-margin mode (v2)

**v2-only** (`?dev=v2`). When `TicketPanel` runs in v2 (`getDevVersion() === 'v2'`) it passes a `marginPair` (`{ bid, ask }`) plus `onMarginPairChange` into `PricingPanel`; their presence flips on the dual-margin layout (`useDualMargin`). v1 keeps the single shared-margin control documented under fixed mode above.

Layout (revised in Phase 6.1, item #1):

- A **3-column flex row**: the BID price cell, the MID cell, the ASK price cell. Each margin input sits in the **same column directly under its own price cell** — BID `MarginRow` under the BID cell, ASK `MarginRow` under the ASK cell. The MID column has no input beneath it.
- `MarginRow` no longer carries a left-side `Bid`/`Ask` label span — the price cell directly above already labels the column, so the span was redundant and the row fits the narrower two-column width without it.
- **Balance** and **Zero** moved to a single **centered row below both inputs** (`BalanceZeroRow`), rather than stacked between the BID and ASK rows as in the first pass. `Balance` mirrors one side's margin onto the other; `Zero` clears both.
- The native number-input spinner is suppressed globally (`input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none }` + `-moz-appearance: textfield` in `src/styles/global.css`) so the dedicated `−`/`+` buttons are the only adjustment surface and the side-by-side inputs stay aligned.

Per-side testids carry a side suffix so the two `MarginRow`s are independently addressable: `margin-minus-bid` / `margin-input-bid` / `margin-plus-bid` and the `-ask` equivalents (v1's single control keeps the unsuffixed `margin-minus` / `margin-input` / `margin-plus`). The `BalanceZeroRow` exposes `margin-balance` and `margin-zero`. Each input keeps the `data-margin-glow="true"` 600ms indigo glow on change.

> **Gating note:** this dual-margin layout shipped behind `?dev=v2` in Phase 6, but FXSW-047 promoted v2 to GA and removed the `?dev=v2`/`?theme=preview` flags. On current `main` the dual-margin layout is the default; the surviving preview flag is `?dev=v3` (see below). The broader v2-GA wording across these pages is stale pending a separate reconciliation pass.

## One-sided markup lock (v3)

For a **one-sided** request (`quoteSide !== 'BOTH'`) under v3, the non-quotable side's markup is locked so the trader can only mark up the side actually being quoted. `TicketPanel` sets `restrictMarginSides = isV3()` and threads it into both `PricingPanel` (spot) and `ForwardPointsPanel` (forward — see [forward-pricing.md](forward-pricing.md)):

- the locked side's `MarginRow` stepper + input are **`disabled`** (via the `disabled` prop on `MarginRow`),
- **Balance / Zero are hidden** when `restrictMarginSides && quoteSide !== 'BOTH'`.

Testids are unchanged — the lock is a prop-driven `disabled` state, not a new element. The price cells were already side-gated. GA (no `?dev=v3`) keeps both sides editable. (FXSW-068)

## ESP read-only view (v3)

Under v3, opening a **happy auto-priced (ESP / `AUTO`) deal** no longer fires SI `PickUp` — there is nothing to intervene on. Instead `TicketPanel` opens a **read-only** view (`autoView`, latched once per open, entered when `isV3() && rfsState === 'Executable' && siState === 'Initial'`):

- panel carries **`data-readonly="true"`**; header reads "Auto-priced",
- shows the deal terms + the streamed client price only — **no Pricing Panel and no Footer** (no actions),
- an **`auto-priced-note`** paragraph explains the price was streamed within tolerance with no manual markup.

The same auto-priced framing surfaces later in the [historical detail](historical-detail.md) overlay (the `AUTO_PRICE` timeline phase + auto-priced markup note). GA behaviour is unchanged — opening an `AUTO` deal there is a no-op as before. (FXSW-069)

## v4 instrument branches — NDF / Swap

Under `?dev=v4`, `TicketPanel` branches on `instrumentOf(deal)` (`data-instrument` on the panel reflects it):

- **NDF** (points-only) — renders the [forward points panel](forward-pricing.md) **minus** the spot-margin control and the markup-mode toggle, plus an `ndf-note`. The spot margin is structurally zeroed (`spotMarginFor`), in the manual *and* auto-priced views and in the capture. Full detail: [features/ndf.md](ndf.md).
- **SWAP** (two-leg) — renders the two-leg `SwapPanel` (NEAR/FAR blocks, raw net row, `swap-markup-mode` Per-component/Total toggle, client net + P/L) instead of the spot/forward panels, with the one-sided lock across both legs + net and a `readOnly` auto-priced variant. Full detail: [features/swaps.md](swaps.md).

Both reuse the existing lifecycle — **no new states/machines** ([deal-machine.md](../components/deal-machine.md)). Spot/outright keep the panels documented above. GA and `?dev=v3` are unaffected.

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

**Mobile compaction (Phase 6.1, item #8):** the footer tightens at narrow widths so its buttons stay on one line down to ~428px — `px-2 gap-1` on mobile, `sm:px-5 sm:gap-2` on desktop; the shared button primitives (`ActionButton` / `HoldButton` in `src/components/Button.tsx`) drop to `px-2 text-xs` with `sm:px-4 sm:text-sm`; and the "Return to Stream" label compresses to just "Stream" via `<span class="hidden sm:inline">Return to </span>Stream`. Desktop appearance is byte-for-byte unchanged.

### Hold-to-confirm + double-click

Reject and Send Stream require **600ms hold** OR **double-click** to fire. Implemented as `HoldButton` in `src/components/Button.tsx` (lifted to a shared primitive in FXSW-030 once a second consumer arrived — the same primitive is reused by the [AI suggestion panel](ai-margin-suggestion.md)'s credit-decline Reject shortcut):

- 600ms `setTimeout` on `pointerDown`, cancels on `pointerUp` / `pointerLeave`.
- `onDoubleClick` is the alternative confirm path. Two single clicks (each cancelled) still register as a `dblclick` at the DOM level.
- Visual progress overlay via an inline-styled `<span>` driven by a `holdgrow` keyframe in `global.css`.
- `aria-describedby` hint ("Hold for 600ms or double-click to confirm") per `docs/05` §7 accessibility note.

Both `TicketFooter.tsx` and `SuggestionPanel.tsx` import from the shared `src/components/Button.tsx`. The footer aliases the import (`import { Button as ActionButton, HoldButton }`) so its existing JSX call sites stay unchanged.

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
