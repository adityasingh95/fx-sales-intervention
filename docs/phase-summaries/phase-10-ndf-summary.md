# Phase 10 (v4) — NDF (Non-Deliverable Forward)

Brand-neutral summary of Phase 10. Adds the `instrumentType` discriminator and the
first v4 instrument — the **NDF**, a cash-settled, points-only forward — all behind
`?dev=v4`. The bare-URL GA app and `?dev=v3` are byte-unchanged; the seed-42 golden
and the GA spot + mid sequence remain the determinism gate.

## Scope

1. **`instrumentType` discriminator** — `Deal.instrumentType`
   (`SPOT|OUTRIGHT|NDF|SWAP`), optional with an `instrumentOf(deal)` resolver that
   derives the default from tenor for legacy deals (so the ~13 existing fixtures
   are untouched). `buildDeal` always sets it on injected deals.
2. **NDF instrument** — a single-leg, cash-settled forward priced **points-only**:
   no spot-level markup, no all-in/per-component toggle. An NDF must carry a
   forward tenor; a SPOT request is coerced to the shortest forward tenor in
   `buildDeal`. The one-sided lock and the All-in/P&L (outright + points margin)
   carry over from the v3 forward work unchanged.
3. **Surfaces** — a v4-only Dev Injector instrument selector (`Auto`/`NDF`), a
   v4-only Instrument column in both blotters, and an Instrument field in the
   historic detail panel.

## Tickets

| Ticket | Summary |
|---|---|
| FXSW-078 | `instrumentType` field + resolver + v4 injector selector |
| FXSW-079 | NDF points-only pricing (no spot markup, no markup toggle, `ndf-note`) |
| FXSW-080 | NDF blotter/detail surfaces + Phase 10 Security Agent pass |
| FXSW-081 | Phase 10 docs + dev-log + this summary; BACKLOG statuses |

## Decisions

- **User-directed:** AI Margin Suggestion for NDF applies to the points margin
  only (specs settled in the Phase 9 doc round); proceed ticket-by-ticket.
- **Agent-directed:** make `instrumentType` optional + `instrumentOf()` resolver
  rather than required (zero churn to legacy `Deal` fixtures, still type-safe);
  centralise the NDF SPOT→forward-tenor coercion in `buildDeal` (single source);
  keep the Trader Rate rate cells for NDF (the spot still feeds the outright) and
  remove only the markup; gate every new surface on `isV4()` so GA/v3 are
  byte-stable; injector instrument options limited to `Auto`/`NDF` (SWAP added in
  Phase 11).

## Security review

See `security/FXSW-081-review.md` for the cold end-of-phase review. The proposed
resolution work-item is transcribed into `docs/BACKLOG.md`; out-of-scope findings
are recorded as accepted risk in the report.

<!-- Security posture one-liner + severity counts added at FXSW-081 close. -->

## Gate results

- typecheck (`tsc -b`) ✓ · lint (zero warnings) ✓ · unit/component `test:run` ✓
  (475 tests) · `build` ✓ · `test:e2e` ✓ (11/11, incl. the new `v4-ndf` spec).
- GA spot golden + seed-42 sequence unchanged; v3 forward output unchanged from
  Phase 9; all new behaviour is `?dev=v4`-gated.
