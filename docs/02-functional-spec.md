# 02 — Functional Specification

Detailed behavior of every screen, panel, and interaction. Where this doc references Caplin behavior, it cites the source page. Where it diverges (prototype scope cuts), it says so.

## 1. Layout

The screen is a fixed full-window dark workstation, minimum width 1440px. The vertical division (top-to-bottom):

1. **Header bar** (56px) — app title "FX Sales Workstation", mute toggle, dev injector trigger (when `?dev=1`), session clock.
2. **Active Deals Blotter** (flexes to fill ~55% of remaining height) — primary work area.
3. **Historic Deals Blotter** (~30%) — divider draggable in v1 stretch, fixed in v1.
4. **Ticket overlay** — when a deal is opened for intervention, the ticket appears as a right-side panel covering the right 600px of the screen, overlaying the blotters. The blotters remain visible to the left. Esc closes the panel without action.
5. **Toast stack** — top-right corner, stacked vertically, newest on top.

## 2. Active Deals Blotter

Per Caplin: displays deals that are being priced automatically, waiting to be priced, under review by sales traders, being priced by sales traders, and just-completed (5s grace period). All trades — including ESP — pass through.

### Columns (left to right)

| Column | Source | Width | Notes |
|---|---|---|---|
| Status | Deal state | 110px | Color-coded pill. See state model `03`. |
| Time | Deal `createdAt` | 80px | `HH:mm:ss`, local. |
| Client | Deal `clientName` | 160px | |
| Account | Deal `accountCode` | 100px | |
| CCY Pair | Deal `pair` | 80px | Monospace, uppercase. |
| Side | Deal `side` | 60px | "BUY" green, "SELL" red. |
| Amount | Deal `notional` | 120px | Right-aligned, thousands separator. Base CCY suffix. |
| Tenor | Deal `tenor` | 60px | "SPOT" for spot deals. |
| Rate | Current trader rate | 120px | Monospace, blinks 1 tick on update. |
| Reasons | Rejection reasons | 200px | Comma-joined chip labels. Empty for ESP deals. |
| Trader | Picked-up-by | 100px | Empty until a trader picks up. |

### Sorting & filtering

- Default sort: Status (intervention states first), then Time descending.
- Status priority: PENDING_INTERVENTION > UNDER_REVIEW > PRICING > QUOTED > AUTO_PRICED > COMPLETED.
- Column headers clickable to re-sort. No filter UI in v1.

### Row states & visual treatment

The pill label shown in the Status column is the **derived display label** from both trade models — see `03-trade-state-model.md §6` for the full mapping table. Visual treatment per label:

| Display label | Underlying SI state | Row treatment |
|---|---|---|
| `INTERVENE` | `Initial` (with `Dealable=true`) | Amber left-edge bar (4px), row flash on entry (300ms fade from amber 30% → transparent), Status pill amber |
| `PICKING UP` | `PickUpSent` | Blue left-edge bar, pill blue, subtle pulse |
| `PICKED UP` | `PickedUp` | Blue left-edge bar, pill blue |
| `STREAMING` | `Quoted` | Teal left-edge bar, pill teal, Rate cell pulses on every tick |
| `WITHDRAWING` | `WithdrawSent` | Teal bar, pill teal with spinner |
| `RELEASING` | `HoldSent` | Amber bar (transitional), pill amber with spinner |
| `REJECTING` | `RejectSent` | Red bar (transitional), pill red with spinner |
| `AUTO` | `Initial` (ESP path, no SI) | No bar, pill grey |
| `DONE` | `TradeConfirmed` | Green pill, row dims to 60% opacity then unmounts at 5000ms |
| `REJECTED` | `TraderRejected` | Red pill, dim + unmount at 5000ms |
| `DECLINED` | `ClientRejected` | Red pill, dim + unmount at 5000ms |
| `EXPIRED` | RFS `Expired` | Grey pill, dim + unmount at 5000ms |

### 5-second removal rule

Per Caplin: completed/rejected/expired deals stay in Active for exactly 5 seconds after entering the terminal state, then move to Historic. Terminal states are: `TradeConfirmed`, `TraderRejected`, `ClientRejected`, `Expired`, `ClientClosed`. Implementation: each terminal transition fires `removeFromActive` via an XState `after: 5000` transition; the row's `data-removing="true"` attribute toggles at t+0 for the dim animation; the row unmounts at t+5000ms.

### Row interactions

- Single click anywhere on an intervention-state row → opens the SI ticket.
- Single click on a non-intervention row → no-op (logged in dev console).
- Double click → no special behavior in v1.
- Hover → row highlight (subtle, 4% lighter background).

### Empty state

"No active deals. Use the dev injector (top right) to start a scenario." Shown when active list is empty.

## 3. Historic Deals Blotter

Per Caplin: displays trades in terminal states (completed, cancelled, rejected, expired). Caplin notes confirmation tickets can be launched from Historic — **not implemented in v1**.

### Columns

Same as Active, except:
- Status column shows the terminal state.
- Rate column shows the final executed rate (or final quoted rate for non-completed).
- Reasons column hidden.
- Add "Outcome" column at the end (160px): `Executed` / `Rejected by Trader` / `Rejected by Client` / `Expired` / `Cancelled`.

### Sorting

Default: time descending. Most recent terminal events at the top.

### Capacity

Session-only. No paging in v1; cap at 100 rows, drop oldest beyond that.

## 4. SI Ticket (Spot)

Triggered by clicking an intervention-state row. Ticket structure follows Caplin's "shared common layout": Reasons, Summary, Pricing, Client Summaries, Deal Summary, Footer.

### 4.1 Reasons Panel (top of ticket)

- Title: "Risk Analysis"
- Body: one chip per rejection reason. Each chip: icon + label + 1-line explanation.
  - `OFF_HOURS`: "Outside trading window — current time is outside the auto-pricer's configured hours for this pair."
  - `SIZE_LIMIT`: "Notional exceeds auto-pricing band — manual approval required for trades over the configured size threshold."
  - `CREDIT_LIMIT`: "Client credit limit would be breached — manual approval required."
- Always visible.

### 4.2 Summary Panel

Natural-language one-liner generated from the deal:

> "Client **[Name]** wants to **[BUY|SELL] [amount] [base_ccy]** vs **[quote_ccy]** for **[tenor]** settlement."

Plus a key/value strip: Account · Trade Date · Settlement Date.

### 4.3 AI Margin Suggestion Panel

A recommended margin in pips with a one-line rationale and an Apply button. Full engine spec in `09-suggestion-engine.md`.

Visible when SI state = `PickedUp`. Hidden once a quote is sent or any terminal action is taken.

Layout:

- **Header row:** sparkle icon + "AI Margin Suggestion" + confidence badge (Low / Medium / High) + a small "Recompute" icon button.
- **Body:** large number (the suggested pips) + short rationale (≤ 120 chars).
- **Footer:** "Apply" (primary CTA) + "Why?" (text button that expands the factors list).
- **Expanded "Why?" state:** a small table showing each contributing factor, its delta in pips, and a brief note.

Behavior:

- Computed within 800ms of `PickedUp`. Shows "Recomputing…" affordance during the debounce window.
- Reactive to volatility shifts > 30% from the value used at last computation; otherwise stable.
- Clicking Apply sets `marginPips` to the suggested value. The Pricing Panel's margin field animates to the new value over 200ms. The panel then collapses to a confirmation strip: "Applied {N} pips · Undo".
- Clicking Undo restores the previous margin and re-expands the panel.

Credit-limit special case: when rejection reasons include `CREDIT_LIMIT`, the panel does **not** propose a margin. Instead it shows "Credit limit breach — recommend declining." with a **Reject** shortcut button. The Apply button is hidden.

Distinct visual treatment described in `05-ui-ux-spec.md §4.5`.

### 4.4 Pricing Panel

The interactive heart of the ticket. Single row for Spot (per Caplin "spot ticket's pricing panel consists of a single row").

Layout (left to right):

| Element | Behavior |
|---|---|
| Label "Trader Rate" | static |
| Bid box | shows current bid from feed, monospace, mid-large size, updates live |
| Mid display | current mid, dimmer |
| Ask box | shows current ask, monospace, updates live |
| Refresh button | only visible when in fixed mode; snaps trader rate to current market |
| Label "Margin (pips)" | static |
| Margin − button | decrements client margin by 1 pip |
| Margin field | numeric input, accepts integer pips, default = client's default margin (3 for v1) |
| Margin + button | increments by 1 pip |

**Two modes:**

- **Streaming mode** (default): trader rate boxes update live. Margin adjustments are reactive.
- **Fixed mode**: triggered by single-clicking the Bid or Ask box. The clicked box highlights; rates freeze; "Refresh" button appears. Click "Return to Stream" in the footer to resume.

### 4.5 Client Summaries Panel

Read-only preview of what the client will see:

- **Client Bid** = trader bid − margin
- **Client Ask** = trader ask + margin
- **Estimated profit** = margin × notional × notional-to-pip multiplier, formatted in USD equivalent (use a static EUR/USD-style table for v1; precision doesn't matter as long as it changes when margin changes).

Updates live in streaming mode; frozen in fixed mode.

### 4.6 Deal Summary Panel

Read-only details:
- Direction (BUY/SELL of base CCY)
- Notional (with currency code)
- Account name + code
- Trade date (today)
- Settlement date (T+2 for spot; calculated, not from feed)

### 4.7 Footer / Actions

Five buttons. Visibility gated on the SI machine's current state (see `03-trade-state-model.md`). Caplin's documented actions in parentheses.

| Button | Visible when SI state ∈ | Effect (Caplin event) |
|---|---|---|
| **Reject** (`Reject`) | `PickedUp`, `Quoted` | Sends `Reject` → `RejectSent` → `TraderRejected`. Hold-to-confirm. |
| **Release** (`Hold`) | `PickedUp` | Sends `Hold` → `HoldSent` → back to `Initial` with `Dealable=true`. |
| **Send Stream** (`Quote` in streaming mode) | `PickedUp` (streaming mode) | Sends `Quote` → `QuoteSent` → `Quoted`. Hold-to-confirm. |
| **Send Quote** (`Quote` in fixed mode) | `PickedUp` (fixed mode) | Sends `Quote` with captured rate → `QuoteSent` → `Quoted`. |
| **Withdraw** (`Withdraw`) | `Quoted` | Sends `Withdraw` → `WithdrawSent` → back to `PickedUp`. |
| **Return to Stream** | `PickedUp` and fixed mode | Resumes streaming locally; replaces "Send Quote" with "Send Stream". |

**Reject** and **Send Stream** require confirmation (600ms hold or double-click) to prevent accidental terminal actions on the demo.

### 4.8 Ticket open/close

- Opens when the operator clicks a row in `Initial` (SI) state, firing the `PickUp` event. The button is disabled during `PickUpSent`.
- Closes via Esc, clicking outside the panel, or any terminal action.
- Closing without action leaves the deal in its current state (e.g. `PickedUp`) — it does **not** auto-Hold/Release. Another trader cannot pick up a `PickedUp` deal; the operator must click Release explicitly to flip `Dealable` back to true.

## 5. Notifications

### 5.1 Trigger

A notification fires when a deal first appears in the Active Blotter with `Dealable=true` and SI state = `Initial` (i.e. needs a trader to pick it up). It does **not** re-fire when a previously-picked-up deal is Released back to dealable.

### 5.2 Visual cues (always fire)

- **Row flash** on the new row in the Active Blotter (amber 30% → transparent, 300ms).
- **Toast** in top-right corner with text "New SI request: [Client] wants to [side] [amount] [pair]." Auto-dismisses at 6s. Clicking the toast opens the ticket.
- **Title-bar flash**: document title prefixed with "● " for 5s, then restored. Helps if the trader is in another tab.

### 5.3 Audible cue

- One short ping (180ms, 880 Hz sine with quick decay). Generated via WebAudio API, no asset file.
- Suppressed when mute is on.
- **Audio gating:** browsers block autoplay until first user gesture. The app subscribes to the first `click`/`keydown` event on document and calls `audioContext.resume()`. Until then, audible cues silently fail. The header mute toggle is the visible affordance to remind users.

### 5.4 Mute toggle

- Located in the header.
- Two states: bell icon / bell-slash icon.
- Persists to `sessionStorage` key `si.muted`.
- Default: unmuted.

## 6. Dev Injector

Hidden by default. Shown when URL has `?dev=1`. Replaces the right side of the header with a row of buttons:

- "Inject: Happy Path ESP"
- "Inject: Off-Hours Intervention"
- "Inject: Credit Breach"
- "Inject: Size Limit + Margin Tune"
- "Inject: Release Path"
- "Reset session"

Each button calls into `services/scenarios/inject(scenarioId)`. See `07-scenario-pack.md` for what each scenario does internally.

## 7. Keyboard shortcuts (v1)

| Keys | Action |
|---|---|
| `Esc` | Close ticket without action |
| `+` / `-` | When ticket open: increment/decrement margin |
| `Enter` | When ticket open in streaming mode: Send Stream (with confirm) |
| `R` | When ticket open: Reject (with confirm) |
| `M` | Toggle mute |

## 8. Error & edge cases

- **Feed silence:** If no pricing update for a pair within 3 seconds, the Bid/Ask cells show "—" and the cell background dims. Restores on next tick.
- **Stale tick:** Ticks older than 2 seconds are discarded (defensive against `setTimeout` drift).
- **Double-click on a row:** Idempotent — opens the ticket once.
- **Two deals for the same pair:** Each has its own ticket; opening the second closes the first.
- **Mute persists across reload** but other state does not (by design).
- **Window blur:** Audible notifications still fire; visual notifications continue. Title-bar flash particularly relevant here.

## 9. Out of scope (functional)

The following appear in the Caplin spec but are explicitly out of v1:

- Forward / NDF / Flexible Forward / Swap / Block Trade tickets (and their additional rows: forward points, all-in rate, fixing date, date range, near/far legs, Deal Breakdown tab).
- Multiple traders simultaneously visible (no "trader" attribution beyond "you").
- Confirmation tickets launched from Historic rows.
- ESP volume bands / forward points / volume-band-dependent pricing.
- Client-side limit orders (stop-loss, take-profit) routed to SI.
