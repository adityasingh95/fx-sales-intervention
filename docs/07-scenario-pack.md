# 07 — Scenario Pack

Named scenarios used by the Dev Injector and Playwright E2E tests.

## 1. Scenario ids

| Scenario | Purpose |
|---|---|
| `HAPPY_PATH_ESP` | Demonstrates an auto-priced flow that completes without manual intervention. |
| `OFF_HOURS_INTERVENTION` | Demonstrates a manual-pricing flow caused by off-hours handling. |
| `CREDIT_BREACH` | Demonstrates credit-limit handling and decline recommendation. |
| `SIZE_LIMIT_MARGIN_TUNE` | Demonstrates size-limit handling and AI margin adjustment. |
| `RELEASE_PATH` | Demonstrates releasing a picked-up ticket back to available state. |

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
  side: 'BUY' | 'SELL';
  notional: number;
  tenor: string;
  tradeDate: string;
  settlementDate: string;
  rejectionReasons: RejectionReason[];
}
```

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

## 8. E2E guidance

- Tests should use stable scenario ids and test ids.
- Tests should avoid relying on visual timing except where explicitly validating the grace-period removal.
- Tests should seed or reset feed state before each scenario.
- Scenario names and state names are compatibility contracts.

## 9. Brand-neutrality

Scenarios must not include vendor names in client names, comments, URLs, UI strings, or test descriptions.
