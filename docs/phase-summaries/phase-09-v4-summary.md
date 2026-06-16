# Phase 9 (v4 groundwork) — bid/ask points, the `?dev=v4` gate, Security Agent

Brand-neutral summary of Phase 9, the first phase of the v4 arc. Two themes: a
**two-sided forward-points refinement** that applies from `?dev=v3` up, and the
**`?dev=v4` gate** plus the **Security Agent** cadence that the NDF/swap phases
build on. The bare-URL GA app is unchanged; the seed-42 golden sequence and the
GA spot baseline remain the determinism gate.

## Scope

1. **`?dev=v4` gate** — a new preview gate that is a strict superset of `?dev=v3`
   (`isV3()` is true under v4), so existing v3 call sites light up with no churn.
   First v4 consumer is NDF (Phase 10); nothing v4-gated ships this phase.
2. **Two-sided forward points (v3+)** — the forward-points feed now returns
   `{ bid, ask, mid }`. `mid` is the original scalar, so the seed sequence is
   byte-stable; the spread is derived RNG-free from the tenor (widens with
   maturity, symmetric around mid). Pricing math and the ticket consume the
   side-specific points (bid all-in uses bid points, ask uses ask points). This
   re-baselines v3 outright-forward output — the one intended visible change.
3. **Security Agent** — the independent, unprimed fifth agent runs at the end of
   every phase from Phase 9 on, reviewing the build cold and filing findings under
   `/security/` with a proposed resolution work-item.

## Tickets

| Ticket | Summary |
|---|---|
| FXSW-072 | `?dev=v4` gate scaffolding (`isV4()`, v4 ⊇ v3) |
| FXSW-073 | Two-sided forward-points feed `{ bid, ask, mid }` |
| FXSW-074 | Bid/ask points through pricing math (`outrightPair`, `clientForwardPair`) |
| FXSW-075 | Two-sided forward-points UI + v3 outright snapshot re-baseline |
| FXSW-076 | Security Agent bootstrap + first review (`security/FXSW-077-review.md`) |
| FXSW-077 | Phase 9 docs + dev-log + this summary; BACKLOG statuses |

## Decisions

- **User-directed:** proceed through the phase ticket-by-ticket; AI Margin
  Suggestion extends to NDF (points margin only) and swap Total mode, hidden in
  swap per-component mode (specs finalised before build).
- **Agent-directed:** make `isV3()` cover v4 (single-gate pattern) rather than
  thread a new flag; keep the feed `mid` identical to the old scalar so the spread
  is purely additive and RNG-free; centralise side-specific point selection in
  `lib/pips.ts` (`outrightPair` / `clientForwardPair`) per the "no pip math in
  components" rule; land the v3 snapshot re-baseline in a single ticket (FXSW-075)
  so visible churn happens exactly once.

## Security review

See `security/FXSW-077-review.md` for the cold end-of-phase review. The proposed
resolution work-item is transcribed into `docs/BACKLOG.md` for Phase 10 triage;
out-of-scope findings are recorded as accepted risk in the report.

<!-- Security posture one-liner + severity counts added at FXSW-077 close. -->

## Gate results

- typecheck (`tsc -b`) ✓ · lint (zero warnings) ✓ · unit/component `test:run` ✓
  (469 tests) · `build` ✓ · `test:e2e` ✓ (10/10, against a fresh `dist/`).
- GA spot golden + seed-42 sequence unchanged; only v3 outright-forward snapshots
  re-baselined to the side-specific values.
- Operational note: `test:e2e` runs `vite preview` against `dist/`, so a
  `pnpm build` is required before E2E whenever runtime output changes.
