# Phase 11 (v4) — Swaps (forward-forward)

Brand-neutral summary of Phase 11. Adds the second class of v4 instrument — the
**FX swap**, two legs (NEAR + FAR) priced together on the net forward-points
differential — all behind `?dev=v4`. The bare-URL GA app and `?dev=v3` are
byte-unchanged; the seed-42 golden and the GA spot + mid sequence remain the
determinism gate. Per `docs/03` §10 a swap is one deal with one lifecycle: **no
new canonical states, events, or machines** — the FAR leg is a pricing/display
concern, so the RFS + SI children and the `*Sent` contract are untouched.

## Scope

1. **Data model + injection** — `instrumentType:'SWAP'` populates `Deal.legs`
   (NEAR + FAR); each leg may be SPOT or any forward tenor, far strictly later
   than near. `buildSwapLegs(near, far?)` validates ordering and coerces a missing
   or out-of-order far to the shortest valid far (last-tenor near steps back). The
   Dev Injector gains a `Swap` instrument and a v4-only far-tenor selector
   (`inject-far-tenor`); the existing tenor control is the NEAR leg.
2. **Points feed** — `swapPointsFeed.get(pair, near, far)` returns each leg's
   two-sided points plus `net = far − near` per side, a **pure composition** of
   `forwardPointsFeed` (no new RNG → seed-42 + the mid sequence are intact).
3. **Pricing math** — `lib/pips.ts` builds client net points + P/L from the net,
   supporting **Per-component** (an independent margin on each leg, summed into the
   net) and **Total** (one margin on the net) markup modes, with one-sided gating
   that zeroes the non-quotable side.
4. **Pricing UI** — a two-leg `SwapPanel` (NEAR/FAR blocks, a prominent net row,
   the `swap-markup-mode` toggle, per-scope Balance/Zero, client net + Est. P/L),
   with the one-sided lock applied across both legs + the net row and a read-only
   variant for auto-priced swaps. `data-instrument="SWAP"`.
5. **Blotter + historic detail** — the v4 Instrument cell shows `SWAP`; the value-
   date cell shows both leg dates (`near → far`); the historic overlay lists per-
   leg tenors/points/value-dates, the net differential, and the net used for
   execution (captured at QuoteSent via a new `AppliedMargin` swap variant).

## Tickets

| Ticket | Summary |
|---|---|
| FXSW-082 | Swap data model (`buildSwapLegs`, `Deal.legs`) + injector far-tenor |
| FXSW-083 | Swap points feed (`net = far − near`, pure composition) |
| FXSW-084 | Swap pricing math (per-component / total modes, one-sided gating) |
| FXSW-085 | Swap two-leg pricing UI (net row, markup toggle, side lock) |
| FXSW-086 | Swap blotter dual value dates + historic detail + execution capture |
| FXSW-087 | Phase 11 Security Agent pass + docs + this summary; BACKLOG statuses |

## Decisions

- **User-directed:** Phase 11 began only after a "highest-severity only" security
  remediation pass (toolchain + external-feed surface; see below) cleared the open
  Critical/High items; the deferred state-machine hardening (FXSW-088 F-1/F-2/F-3)
  was carried into Phase 11 — but swaps add no new machines, so it remains a
  separate concern rather than being invalidated.
- **Agent-directed:** keep all swap math in `lib/pips.ts` and all swap points in
  `services/feed/swapPoints.ts` (the feed stays instrument-agnostic; instrument
  semantics live in pips/UI); the swap net row shows the raw differential
  (far − near) with client net + P/L derived from it, so a zero-markup quote shows
  exactly the differential; `SwapPanel` owns its markup state and reports only the
  effective net margin upward for capture (keeps `TicketPanel` from growing);
  per-component margins **sum** into the net (mirrors the v3 spot+fwd sum); reuse
  `MarginRow`/`BalanceZeroRow` and the `restrictMarginSides`/`quoteSide` lock so
  side-gating behaves identically to v3 forwards.

## Security review

See `security/FXSW-087-review.md` for the cold end-of-phase review. **7 findings:
0 Critical, 1 High, 2 Medium, 2 Low, 2 Info.**

**Posture:** the swap price-integrity posture is good — the net differential
(far − near) is built once at the feed boundary with no new RNG draws, margins are
floored non-negative, and crucially the **one-sided lock is enforced in the
pricing math** (`gateMarginToSide` in `lib/pips.ts`), not UI-only, closing a
single-point-enforcement weakness flagged in earlier phases; captured execution
margins reconcile with what the historic detail recomputes (F-4, positive Info).
The residual functional risks are softer: `buildSwapLegs` **silently coerces** a
missing/out-of-order (far ≤ near) far leg rather than refusing it (F-1, Medium —
can price a different tenor pair than requested) and a one-sided swap still renders
the off-side **raw** net (dimmed, not suppressed) (F-2, Low). On the technical
track the FXSW-088/089 remediation **landed** (restrictive CSP, Bearer-header API
key, opt-in + range-validated build fetch, toolchain 24 → 5 advisories); the
remaining items are the two **High** dev-tooling advisories needing a `vite` 5→6
bump (T-1) and an internal inconsistency where the new `connect-src 'self'` CSP
blocks the opt-in live poller while its key is still collected into
`sessionStorage` (T-2, Medium). None of these are swap-pricing defects. They are
filed as **FXSW-091** for next-phase triage (the review's own work-item is
renumbered from its cold-proposed FXSW-090, which was already taken by the GA-core
determinism item).

## Determinism + compatibility

- Seed-42 golden, the GA spot + mid sequence, and the v3 forward goldens are
  byte-stable (the swap points feed adds no RNG draws). Canonical state names and
  `data-*` test attributes are unchanged; all new surfaces are gated on `isV4()`.
- `dist/` remains brand-neutral in user-visible strings and contains no source
  maps. The simulated feed is the default and the only test/E2E path.
- Gates green at phase close: `lint`, `typecheck`, `test:run` (513 unit),
  `test:e2e` (14 specs incl. two new swap specs).
