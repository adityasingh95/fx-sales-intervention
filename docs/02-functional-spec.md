# 02 — Functional Specification

This document defines screen-level behaviour for FX Sales Workstation.

## 1. Application shell

The app renders a single-page dark workstation:

- Header with product name, environment badge, Dev Injector slot, mute toggle, and lightweight status area.
- Main content area with Active Deals and Historic Deals blotters.
- Ticket overlay opened from an eligible Active row.
- Toast stack for new manual-pricing requests.

## 2. Active Deals Blotter

Shows live deals until they reach terminal state and complete the grace-period removal.

### 2.1 Row eligibility

A row is clickable when:

- the deal is in the SI channel,
- the SI state is `Initial`,
- `Dealable=true`, and
- at least one rejection reason is present.

Clicking such a row opens the ticket and sends `PickUp` into the SI machine.

### 2.2 Display status

The displayed status is derived from the RFS state, SI state, and `Dealable` flag. Terminal states override partner-machine labels during the grace-period window.

Expected display statuses include:

- `AUTO`
- `INTERVENE`
- `PICKED UP`
- `QUOTING`
- `QUOTED`
- `WITHDRAWING`
- `RELEASING`
- `REJECTING`
- `DONE`
- `REJECTED`
- `DECLINED`
- `EXPIRED`

### 2.3 Five-second removal

After a terminal SI state is reached, the row remains in Active briefly with terminal styling. It is then removed from Active and archived to Historic.

## 3. Historic Deals Blotter

Shows archived terminal deals. Each row should preserve enough detail for demo traceability:

- deal id,
- client,
- pair,
- side,
- notional,
- terminal outcome,
- terminal state,
- last known rate where available.

Historic rows are read-only in v1.

## 4. Ticket overlay

The ticket opens from an eligible Active row. It is a right-side glass panel on desktop and full-width on narrow screens.

### 4.1 Reasons Panel

Shows one chip per rejection reason:

| Reason | Label | Summary |
|---|---|---|
| `OFF_HOURS` | Off-hours | Request is outside configured trading hours. |
| `SIZE_LIMIT` | Size limit | Request exceeds automatic pricing size. |
| `CREDIT_LIMIT` | Credit limit | Request breaches available credit. |

### 4.2 Summary Panel

Renders a concise natural-language summary:

`Client [Name] wants to [BUY or SELL] [amount] [base currency] vs [quote currency] for [tenor] settlement.`

Also shows account, trade date, and settlement date.

### 4.3 AI Margin Suggestion Panel

For non-credit cases, renders a deterministic suggested margin with a short rationale and an Apply action. After apply, the panel shows Applied state and allows Undo.

For credit-limit cases, the panel recommends declining rather than widening price.

### 4.4 Pricing Panel

Supports two modes:

- **Streaming mode:** bid/ask update from the simulated pricing feed.
- **Fixed mode:** clicking a side freezes the selected quote until refreshed.

The trader may adjust margin in pips using +/- buttons or numeric input. Client price and estimated profit update from the selected margin.

v2 enhancements to side selection, dual-side margins, and direction-aware quoting are defined in §6 "v2 enhancements" below.

### 4.5 Client Summary

Displays read-only client bid/ask preview and estimated profit.

### 4.6 Deal Summary

Displays deal fields such as direction, notional, account, trade date, and settlement date.

### 4.7 Footer actions

| Action | Availability | Behaviour |
|---|---|---|
| Reject | `PickedUp` or `Quoted` | Sends reject flow and closes terminally after acknowledgement. |
| Release | `PickedUp` or `Quoted` | Sends hold/release flow and returns the row to available state. |
| Send Stream | `PickedUp`, streaming mode | Sends streaming quote. |
| Send Quote | `PickedUp`, fixed mode | Sends fixed quote. |
| Withdraw | `Quoted` | Withdraws live quote. |
| Return to Stream | fixed mode before quote | Re-enters streaming mode. |

Hold-to-confirm is used where the UI spec requires deliberate confirmation.

### 4.8 Closing the panel

Esc and backdrop close the ticket UI without changing deal state. Release explicitly changes the deal state and closes the ticket.

## 5. Notifications

New manual-pricing requests fire:

- row flash,
- toast,
- title flash,
- optional audio chime if unmuted and browser audio is unlocked.

Mute persists to `sessionStorage`.

## 6. Dev Injector

The Dev Injector appears only with `?dev=1`. It exposes buttons for the named scenarios in `docs/07-scenario-pack.md` and a Reset control.

`?dev=v2` also activates the Dev Injector (as a superset of `?dev=1`) and additionally exposes the Phase 6 scenarios (BOTH-sided, quote-currency-dealt) and the v2 UX enhancements described in §7 below.

## 7. v2 enhancements (behind `?dev=v2`)

Phase 6 work lands behind a URL gate so the shippable v1 behaviour on `main` is unaffected. A single source of truth — `src/lib/devVersion.ts` — exports `devVersion: 'v1' | 'v2'` based on `?dev=v2`. Components branch on that constant. v1 paths are not removed during Phase 6.

### 7.1 Side selection in fixed mode (Pricing Panel)

In v1, clicking BID or ASK enters fixed mode and the clicked cell receives a focus outline; the unselected cell looks identical to streaming mode. In v2:

- The selected cell keeps the existing focus outline.
- The non-selected cell renders with `data-dimmed="true"` — reduced opacity (≈50%) and a muted border. Price values continue to update in the dimmed cell so the trader still sees the market.
- **Re-click the same side** while in fixed mode — pricing mode returns to streaming. Both cells return to normal opacity.
- Clicking the **other** side switches `fixedSide` to that side and re-applies the dim treatment to the previously selected cell.
- When the request is one-sided (see §7.3), only the appropriate side accepts clicks. The non-quoteable cell renders `data-disabled="true"`, retains live price updates, but has no click handler and a `cursor: not-allowed`.

### 7.2 Dual-side margin inputs (Pricing Panel)

The single margin input is replaced by two independent inputs in v2:

- **Bid margin** input (`data-testid="margin-input-bid"`).
- **Ask margin** input (`data-testid="margin-input-ask"`).

Both default to `deal.defaultMarginPips`. Each carries its own `−` / `+` buttons. Keyboard `+` / `-` targets whichever input has focus.

Two action buttons sit between them:

- **Balance** — sets both margins to the average of the current pair, preserving the implied mid + spread the trader had configured. Concretely: `balanced = (marginBid + marginAsk) / 2`, then both sides set to `balanced` (rounded to the nearest integer pip).
- **Zero** — sets both margins to `0`.

The AI Margin Suggestion remains a single value (engine API unchanged). On Apply, the same suggested value is written to both sides. Undo restores the prior pair.

### 7.3 Request direction semantics and dealt currency

In v1, a deal has `side: 'BUY' | 'SELL'` and the dealt currency is implicitly the pair's base. In v2 the model is extended:

- `side: 'BUY' | 'SELL' | 'BOTH'`.
- `dealtCcy: 'BASE' | 'QUOTE'` — explicit indication of which leg of the pair the notional is denominated in.

The bank-quote side a request maps to is determined by `quoteSideFor(side, dealtCcy)`:

| Client side | Dealt CCY | Bank action | Quote side |
|---|---|---|---|
| BUY | BASE | bank sells base | ASK |
| SELL | BASE | bank buys base | BID |
| BUY | QUOTE | bank buys base = sells quote | BID |
| SELL | QUOTE | bank sells base = buys quote | ASK |
| BOTH | (n/a) | two-sided quote | BOTH |

Footer-button visibility flows from quote side:

- Quote side `ASK` → only the ASK cell is clickable; Send Quote sends an ASK price.
- Quote side `BID` → only the BID cell is clickable; Send Quote sends a BID price.
- Quote side `BOTH` → either cell selectable; default streaming is two-sided.

The notification toast text reads from the dealt currency, e.g. "Globex Industries wants to sell 5,000,000 USD USDJPY" (USD = quote ccy dealt) or "wants to trade 5,000,000 USD USDJPY" for `BOTH`.

### 7.4 Resizable blotter divider

The Active vs Historic blotter split is adjustable by dragging a horizontal handle between the two sections. Clamp: 20%–80% of available height. Persistence: sessionStorage under `blotterSplit` (extends the existing settings store used by mute).

Both blotter bodies retain internal vertical overflow scrolling so neither pushes the other when content grows beyond its allotted height.

### 7.5 Mobile card-stack layout

Below the Tailwind `md` breakpoint (768px), each blotter row renders as a stacked card rather than a horizontal-scroll row. Per-card content:

- **Active card row 1:** status pill, amount + currency, pair.
- **Active card row 2:** client name, side, reasons chips.
- **Historic card row 1:** time, amount + currency, pair.
- **Historic card row 2:** client name, outcome.

Tapping a card opens the ticket panel (already full-width on mobile per §4). The `min-w-[1100px]` / `min-w-[920px]` floors on the blotter containers are removed below md.

## 8. Theme switching (behind `?theme=preview`)

Phase 7 adds a light theme alongside the existing dark theme. The toggle is gated behind a separate URL flag — `?theme=preview` — so the dark-only behaviour on `main` is preserved until the light theme is promoted to general availability. `?theme=preview` is orthogonal to `?dev=v2`: both flags can be set together, or independently.

### 8.1 Theme model

- `ThemeMode = 'dark' | 'light'`.
- `themeStore` (Zustand) holds the active mode and exposes `setMode(mode)` and `toggle()`. The current value is mirrored as `document.documentElement.dataset.theme` ("dark" or "light"), which the CSS variable block in `tokens.css` selects on.
- Persistence: sessionStorage key `si.theme`. Lifetime matches the existing `si.muted` and `si.blotterSplit` keys — survives reload, dropped at tab close (per CLAUDE.md §3).

### 8.2 First-visit default

When `?theme=preview` is on and no sessionStorage value exists, the initial mode is read from `window.matchMedia('(prefers-color-scheme: light)').matches` — light if the OS prefers light, dark otherwise. Once the trader toggles, that choice is persisted and the system preference is no longer consulted on this tab.

When `?theme=preview` is **off**, the app forces `dark` regardless of system preference, sessionStorage, or any other input — same as v1 behaviour.

### 8.3 Toggle UI

The toggle (`ThemeToggle` component, Sun / Moon icons from `lucide-react`) renders in the header next to `MuteToggle`. Only mounted when `themeMode !== null` — i.e. when `?theme=preview` is on. The icon shown is the **target** mode (sun when dark is active, moon when light is active), matching the convention used by GitHub, Linear, and most modern dev tools.

Keyboard accessible: focusable, `Enter` / `Space` invokes `toggle()`. `aria-pressed` reflects current mode (`"true"` = light, `"false"` = dark). `aria-label` updates dynamically: "Switch to light theme" / "Switch to dark theme".

### 8.4 Scope of the theme

Every UI surface respects the theme:

- App background, panel backgrounds, borders, text colours.
- Status pills (PENDING_INTERVENTION amber, PICKED UP blue, etc.) — accents stay recognisable but luminance is rebalanced for the new surface.
- AI Margin Suggestion panel — indigo accent is preserved as the "AI moment-of-delight" identifier; the surrounding panel wash and border tone shift to suit the active theme.
- Toast chrome, row-flash keyframe, ticket overlay glass, the resize handle, the dev injector.

No surface is exempt. There is no "dark-only" component.

## 9. Accessibility and test hooks

- Important controls must have labels or clear text.
- Rows and panels expose stable `data-testid` / `data-*` attributes for E2E tests.
- State names and scenario ids are treated as compatibility contracts.

## 10. v3 enhancements (behind `?dev=v3`)

Phase 8 work lands behind a new `?dev=v3` URL gate; bare-URL GA behaviour is
unchanged. A single helper `src/lib/devVersion.ts` exports
`devVersion: 'v1' | 'v3'` and `isV3()`; components and services branch on it.
v3 is a superset of GA (all former v2 features are already GA).

### 10.1 External price ingestion

- An opt-in runtime market-data source refreshes the reference mids. The user
  enters an API key in a settings panel (header gear, v3 only); the key lives in
  `sessionStorage` and is never bundled.
- When enabled, the app polls the provider every 5 minutes, maps quotes to the
  four pairs' reference mids, and updates the feed anchor. The existing
  randomizer keeps ticking (~300ms) between polls, mean-reverting toward the new
  anchor.
- Default OFF. With no key / disabled, behaviour is identical to GA (baked mids +
  seeded RNG). On error or rate-limit the feed silently keeps the last-known
  anchor; a generic status pill shows Off / Connecting / Live / Error /
  Rate-limited (never a vendor name).

### 10.2 Forwards

- Deals may carry a non-SPOT tenor (1W, 2W, 1M, 2M, 3M, 6M, 9M, 1Y). A forward is
  modelled as one or more legs; v3 uses a single NEAR leg (FAR reserved for
  swaps).
- The outright forward = spot rate + forward points. The trader marks up either
  all-in or per-component (independent spot-margin and forward-points-margin,
  each a bid/ask pair).
- Forward points are simulated deterministically per (pair, tenor) and increase
  with tenor. Client all-in price and estimated P/L derive from both components.

### 10.3 Forward scenario injection

- The Dev Injector gains a SPOT/forward tenor selector. Any existing scenario can
  be injected as a forward; tenor is parameterized at inject time. No new
  scenario definitions are added.

### 10.4 Historical trade detail

- Concluded (Historic) rows become clickable and open a read-only detail overlay
  (same slide-in pattern as the ticket). It shows the deal summary, the markup
  reason (applied margin, whether AI-suggested, and the rationale), and a
  timestamped lifecycle timeline: request → pickup → release → price-back →
  response.
