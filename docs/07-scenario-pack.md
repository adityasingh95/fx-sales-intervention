# 07 — Scenario Pack

Named scenarios used by the Dev Injector and Playwright E2E tests.

## 1. Scenario ids

| Scenario | Purpose | Gated by |
|---|---|---|
| `HAPPY_PATH_ESP` | Demonstrates an auto-priced flow that completes without manual intervention. | `?dev=1` |
| `OFF_HOURS_INTERVENTION` | Demonstrates a manual-pricing flow caused by off-hours handling. | `?dev=1` |
| `CREDIT_BREACH` | Demonstrates credit-limit handling and decline recommendation. | `?dev=1` |
| `SIZE_LIMIT_MARGIN_TUNE` | Demonstrates size-limit handling and AI margin adjustment. | `?dev=1` |
| `RELEASE_PATH` | Demonstrates releasing a picked-up ticket back to available state. | `?dev=1` |
| `BOTH_SIDED_INQUIRY` | Demonstrates a two-sided client request and the v2 dual-margin / either-side response flow. | `?dev=v2` |
| `QUOTE_DEALT_INQUIRY` | Demonstrates a one-sided client request where the notional is in the **quote** currency, exercising the inverted bid/ask convention. | `?dev=v2` |

## 2. Common data fields

Each scenario should provide enough data for:

- Active Blotter row,
- ticket summary,
- reasons panel,
- pricing panel,
- client summary,
- deal summary,
- Historic Blotter archive row.

Suggested common fields:

```ts
{
  scenarioId: string;
  dealId: string;
  clientName: string;
  account: string;
  pair: string;
  side: 'BUY' | 'SELL' | 'BOTH';   // 'BOTH' added in v2
  dealtCcy: 'BASE' | 'QUOTE';      // added in v2; defaults to 'BASE' for v1 scenarios
  notional: number;
  tenor: string;
  tradeDate: string;
  settlementDate: string;
  rejectionReasons: RejectionReason[];
}
```

`dealtCcy: 'BASE'` is the v1-compatible default; the five v1 scenarios above all use base-currency notional. Quote-currency-dealt scenarios are v2-only.

## 3. Scenario 1 — HAPPY_PATH_ESP

### Intent

Show that the workstation can display a normal auto-priced flow and archive it to Historic.

### Flow

1. User opens the app with `?dev=1`.
2. User clicks `Happy ESP`.
3. A row appears in Active with auto-pricing status.
4. The simulated client accepts.
5. The row reaches terminal success state.
6. After the grace period, the row moves to Historic with executed outcome.

## 4. Scenario 2 — OFF_HOURS_INTERVENTION

### Intent

Show a manual-pricing request caused by off-hours handling.

### Flow

1. User clicks `Off Hours`.
2. A row appears in Active with `INTERVENE` status.
3. Notification cues fire.
4. User opens the row.
5. Ticket shows `OFF_HOURS` reason.
6. User sends stream.
7. Simulated client accepts.
8. Row archives to Historic as executed.

## 5. Scenario 3 — CREDIT_BREACH

### Intent

Show that the AI suggestion panel recommends rejection for credit-limit cases.

### Flow

1. User clicks `Credit Breach`.
2. A row appears in Active with `INTERVENE` status.
3. User opens the ticket.
4. Ticket shows `CREDIT_LIMIT` reason.
5. Suggestion panel recommends decline rather than margin adjustment.
6. User rejects.
7. Row archives to Historic as rejected.

## 6. Scenario 4 — SIZE_LIMIT_MARGIN_TUNE

### Intent

Show AI-assisted margin tuning for a size-limit manual-pricing request.

### Flow

1. User clicks `Size Limit`.
2. A row appears in Active with `INTERVENE` status.
3. User opens the ticket.
4. Ticket shows `SIZE_LIMIT` reason.
5. Suggestion panel recommends a margin.
6. User applies the suggestion.
7. Client-price preview updates.
8. User sends stream.
9. Simulated client accepts.
10. Row archives to Historic as executed.

## 7. Scenario 5 — RELEASE_PATH

### Intent

Show that a trader can release a ticket without completing the deal.

### Flow

1. User clicks `Release Path`.
2. A row appears in Active with `INTERVENE` status.
3. User opens the ticket.
4. SI moves to `PickedUp`; row is no longer dealable.
5. User clicks Release.
6. Ticket closes.
7. SI returns to `Initial`.
8. Row remains in Active and becomes dealable again.

## 8. Scenario 6 — BOTH_SIDED_INQUIRY (v2)

### Intent

Demonstrate a client request without a fixed direction; the trader can quote either side as a single quote or stream both sides simultaneously.

### Suggested data

- Client: Acme Corp (platinum)
- Pair: EURUSD
- Side: `BOTH`
- Dealt CCY: `BASE`
- Notional: 8,000,000 EUR
- Rejection reason: `SIZE_LIMIT` (illustrative — the size-limit handling is unchanged)

### Flow

1. User opens the app with `?dev=v2`.
2. User clicks `Both-Sided`.
3. A row appears in Active with `INTERVENE` status and side displayed as `BOTH`.
4. User opens the ticket.
5. Pricing Panel renders both BID and ASK as clickable in fixed mode; default is two-sided streaming.
6. User adjusts the bid margin and ask margin independently via the dual-margin inputs.
7. User clicks Send Stream.
8. Simulated client accepts one of the two sides.
9. Row archives to Historic as executed with the resolved side reflected.

## 9. Scenario 7 — QUOTE_DEALT_INQUIRY (v2)

### Intent

Demonstrate the inverted bid/ask convention when the notional is denominated in the **quote** currency rather than the pair's base.

### Suggested data

- Client: Northwind FX (gold)
- Pair: USDJPY
- Side: `SELL`
- Dealt CCY: `QUOTE` (the notional is in JPY)
- Notional: 1,000,000,000 JPY
- Rejection reason: `OFF_HOURS`

By the convention `quoteSideFor(SELL, QUOTE) = ASK`, the bank quotes the ASK side. The Pricing Panel renders the BID cell with `data-disabled="true"`; the trader cannot click into a BID-side quote.

### Flow

1. User opens the app with `?dev=v2`.
2. User clicks `Quote-Dealt`.
3. A row appears in Active with `INTERVENE`. Side column reads `SELL`. Amount column reads `1,000,000,000 JPY`.
4. Toast text reads "wants to sell 1,000,000,000 JPY in USDJPY".
5. User opens the ticket.
6. Pricing Panel: BID is dimmed and disabled (`data-disabled="true"`); ASK is clickable.
7. User selects ASK, applies ask-side margin, clicks Send Quote.
8. Simulated client accepts.
9. Row archives to Historic as executed.

## 10. E2E guidance

- Tests should use stable scenario ids and test ids.
- Tests should avoid relying on visual timing except where explicitly validating the grace-period removal.
- Tests should seed or reset feed state before each scenario.
- Scenario names and state names are compatibility contracts.

## 11. Brand-neutrality

Scenarios must not include vendor names in client names, comments, URLs, UI strings, or test descriptions.

## 12. v3 — forward injection

Under `?dev=v3` the Dev Injector adds a tenor selector. `player.inject` /
`buildDeal` accept an optional `{ tenor }` override applied over the chosen
scenario's deal; defaults preserve SPOT. The seven scenarios are not duplicated.
Brand-neutral client names are unchanged.

## 13. v4 — instrument injection

Under `?dev=v4` the Dev Injector adds an **instrument selector** (and, for swaps,
a **far-tenor** selector) alongside the v3 tenor control. `player.inject` /
`buildDeal` accept optional `{ instrumentType, farTenor }` overrides applied over
the chosen scenario's deal; defaults preserve the v3 behaviour (`SPOT`/`OUTRIGHT`
from tenor). As with tenor, instruments are a **per-inject parameter** — the seven
scenarios are **not** duplicated, and no instrument-specific scenario definitions
are added. Injector validation (also in `buildDeal`): NDF requires a forward
tenor; swap requires far strictly later than near. Bid/ask forward points apply to
v3 outright forwards too, so no new scenario is needed to exercise them.
