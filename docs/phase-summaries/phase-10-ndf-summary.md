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

See `security/FXSW-081-review.md` for the cold end-of-phase review. **9 findings:
0 Critical, 2 High, 4 Medium, 2 Low, 1 Info.**

**Posture:** the `instrumentOf()` resolver is consistent at every read site and the
SPOT→forward coercion is correct, but the review found that NDF spot-markup
inertness was enforced in a single render path — so the **auto-priced (ESP) NDF
view still applied a 3-pip spot markup** (F-1, High), the quote-context audit
recorded a phantom spot markup (F-3), and the auto view kept the markup toggle
(F-4). These three were **functional regressions against FXSW-079's own AC, so they
were fixed in-phase** during FXSW-080 close: the effective (NDF-zeroed) spot margin
is now computed once and shared by the manual ticket, the auto view, and the capture
hook, and a new auto-priced-NDF E2E guards the path. The remaining items — the
deeper state/math-layer enforcement (F-2) and the carried-over external-surface +
toolchain hardening (T-1 toolchain advisories, T-2/T-3/T-4) — are filed as
**FXSW-089** (overlapping the still-open FXSW-088) for Phase 11 triage. No vendor
names in the report.

## Gate results

- typecheck (`tsc -b`) ✓ · lint (zero warnings) ✓ · unit/component `test:run` ✓
  (475 tests) · `build` ✓ · `test:e2e` ✓ (12/12, incl. the two `v4-ndf` specs —
  manual + auto-priced).
- GA spot golden + seed-42 sequence unchanged; v3 forward output unchanged from
  Phase 9; all new behaviour is `?dev=v4`-gated.
