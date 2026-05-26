# Wiki Index — FX Sales Workstation

Catalog of every wiki page. Organized by category. Updated on every ingest.

## Overview

- [overview.md](overview.md) — product description, goals, personas, in-scope vs out-of-scope, current build state.

## Features

- [features/active-blotter.md](features/active-blotter.md) — live deals view, status pills, row treatment, 5-second removal rule.
- [features/historic-blotter.md](features/historic-blotter.md) — terminal deals, outcome derivation, capacity cap.
- [features/ticket.md](features/ticket.md) — SI ticket panel, panel stack, footer button gating, keyboard shortcuts.
- [features/notifications.md](features/notifications.md) — toast / row flash / title flash / WebAudio chime, mute toggle.
- [features/dev-injector.md](features/dev-injector.md) — hidden injector for scenario playback under `?dev=1`.
- `features/ai-margin-suggestion.md` — _pending ingest of `docs/09-suggestion-engine.md`._

## Components

- [components/rfs-machine.md](components/rfs-machine.md) — RFS Trade Model state machine, prototype subset.
- [components/si-machine.md](components/si-machine.md) — Sales Intervention Trade Model state machine, `*Sent` ack delays, `Removed` cleanup.
- [components/deal-machine.md](components/deal-machine.md) — parent actor, cross-model coordination, context shape.
- [components/status-derivation.md](components/status-derivation.md) — `(rfsState, siState, dealable) → DisplayStatus` mapping.
- [components/pricing-feed.md](components/pricing-feed.md) — random-walk price simulator, Mulberry32 + Box-Muller, seedable.
- [components/deal-feed.md](components/deal-feed.md) — scenario-driven event emitter, state-gate bridge to the store.
- [components/scenario-player.md](components/scenario-player.md) — time-gated + state-gated follow-up dispatcher.
- [components/deals-store.md](components/deals-store.md) — Zustand store, machine spawning, archival to historic.
- `components/suggestion-engine.md` — _pending ingest of `docs/09-suggestion-engine.md`._

## Data models

- [data-models/deal.md](data-models/deal.md) — trade-economics payload.
- [data-models/deal-event.md](data-models/deal-event.md) — discriminated union of feed events.
- [data-models/price-tick.md](data-models/price-tick.md) — single price update shape.
- `data-models/client-profile.md` — _pending ingest of `docs/09-suggestion-engine.md`._
- `data-models/margin-suggestion.md` — _pending ingest of `docs/09-suggestion-engine.md`._

## Decisions (ADRs)

- [decisions/ADR-0002-two-parallel-state-machines.md](decisions/ADR-0002-two-parallel-state-machines.md) — RFS + SI as parallel machines, parent coordinates.
- [decisions/ADR-0005-bake-reference-mids.md](decisions/ADR-0005-bake-reference-mids.md) — Frankfurter prebuild, hard-coded fallback.
- [decisions/ADR-0009-simulated-ack-delays.md](decisions/ADR-0009-simulated-ack-delays.md) — 250ms `*Sent` delays kept, zero-able in tests.
- `decisions/ADR-0001-vite-react-tailwind.md` — _pending ingest of `docs/06-tech-architecture.md`._
- `decisions/ADR-0003-xstate-zustand.md` — _pending ingest of `docs/06-tech-architecture.md`._
- `decisions/ADR-0004-ag-grid-community.md` — _pending ingest of `docs/06-tech-architecture.md`._
- `decisions/ADR-0006-deterministic-suggestion-engine.md` — _pending ingest of `docs/09-suggestion-engine.md`._
- `decisions/ADR-0007-credit-breach-recommend-decline.md` — _pending ingest of `docs/09-suggestion-engine.md`._
- `decisions/ADR-0008-ai-indigo-accent.md` — _pending ingest of `docs/05-ui-ux-spec.md`._
- `decisions/ADR-0010-brand-neutral-product.md` — _pending ingest of `docs/README.md` / `docs/CLAUDE.md`._

## Scenarios

_None yet — pending ingest of `docs/07-scenario-pack.md`._

## Glossary

- [glossary.md](glossary.md) — FX market terms, Sales Intervention workflow terms, RFS + SI state names, blotter fields, prototype-only terms. Source: `docs/00-glossary.md`. Status: `stable`.

## Onboarding

- `onboarding.md` — _written after the full spec pack has been ingested._
