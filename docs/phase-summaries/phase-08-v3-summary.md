# Phase 8 (v3) — External feed, forwards, historical detail

Brand-neutral summary of the v3 phase. All work is gated behind `?dev=v3`; the
bare-URL GA app is unchanged. The seed-42 golden sequence and the six Playwright
scenario specs (which never set the flag) remain the determinism gate.

## Scope

1. **External price ingestion** — an opt-in runtime market-data adapter polls a
   provider every 5 minutes and seeds the existing randomizer's reference anchor.
   Key entered in the GUI (sessionStorage), OFF by default, generic status pill.
2. **Forwards** — full leg-based forward pricing (tenors 1W…1Y) with all-in or
   per-component (spot + forward-points) markup, AI per-component suggestion, and
   tenor-aware value dates. Designed swap-ready (NEAR/FAR `DealLeg`, `LegTabs`).
3. **Historical trade detail** — a per-deal lifecycle event log captured live,
   surfaced via clickable Historic rows opening a read-only detail overlay with
   the markup reason and a timestamped request→pickup→release→price-back→response
   timeline.

## Tickets

| Ticket | Summary |
|---|---|
| FXSW-048 | Reinstate the `?dev=v3` gate (`src/lib/devVersion.ts`) |
| FXSW-049 | Per-deal lifecycle event log (data layer) |
| FXSW-050 | `PricingFeed.setReferences` / `clearReferences` seam |
| FXSW-051 | External market-data adapter + poller |
| FXSW-052 | External feed settings (GUI key) + main wiring |
| FXSW-053 | External feed status indicator + settings popover |
| FXSW-054 | Forward tenor types + pip math + value dates |
| FXSW-055 | Seeded forward-points feed + shared RNG |
| FXSW-056 | PricingPanel split (pure refactor) |
| FXSW-057 | Forward UI panels + client/summary forward support |
| FXSW-058 | AI per-component forward suggestion |
| FXSW-059 | Dev Injector forward toggle + parameterized injection |
| FXSW-060 | Historical trade detail view + markup-reason capture |
| FXSW-061 | Docs (v3 spec sections), CLAUDE.md exceptions, this summary |

## Decisions

- **User-directed:** runtime external adapter with a GUI-entered API key; full
  forward component model now; forward toggle at injection (no scenario
  duplication); gate behind `?dev=v3`; append v3 sections to existing specs.
- **Agent-directed:** previous-close aggregate endpoint (free-tier friendly);
  single phase-source per deal to avoid double-logging; separate RNG instance for
  forward points; `PricingPanel` split + `useSuggestionState` / `useQuoteContextCapture`
  hooks to stay under the 300-line limit.

## Gate results

- typecheck (`tsc -b`) ✓ · lint (zero warnings) ✓ · unit/component `test:run` ✓
  (455 tests) · build pending CI · seed-42 golden + existing scenario E2Es
  unaffected (external feed off by default).
