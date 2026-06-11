# Wiki Index — FX Sales Workstation

Catalog of every wiki page. Organized by category. Updated on every ingest.

## Overview

- [overview.md](overview.md) — product description, goals, personas, in-scope vs out-of-scope. **Phase 5 closed — build complete, project shippable.**
- [onboarding.md](onboarding.md) — **stable.** Joining-Monday guide: demo, architecture, stack, repo layout, commands, three-agent setup, where-to-start map, testing, scenarios, conventions, full build progression, lessons learned.

## Features

- [features/active-blotter.md](features/active-blotter.md) — live deals view, status pills, row treatment, 5-second removal rule, dim-when-ticket-open.
- [features/historic-blotter.md](features/historic-blotter.md) — terminal deals, outcome derivation, capacity cap.
- [features/ticket.md](features/ticket.md) — **stable.** SI ticket panel, panel stack (Reasons/Summary/AI/Pricing/ClientSummary/DealSummary/Footer), streaming + fixed pricing modes, hold-to-confirm + double-click footer actions.
- [features/ai-margin-suggestion.md](features/ai-margin-suggestion.md) — **stable.** AI suggestion panel, ready / applied / credit-decline / computing layouts. Deterministic engine + Apply / Undo / Recompute / Why? / Reject-shortcut.
- [features/notifications.md](features/notifications.md) — **stable.** Toast + title flash + row flash + WebAudio chime + mute toggle + dispatcher dedupe.
- [features/dev-injector.md](features/dev-injector.md) — hidden injector for scenario playback under `?dev=1` / `?dev=v2`; collapses to a `Dev ▾` popover on mobile. Internals in [components/dev-injector.md](components/dev-injector.md).
- [features/theme-switching.md](features/theme-switching.md) — **stable.** Opt-in light theme behind `?theme=preview` (orthogonal to `?dev=v2`); `ThemeToggle` (Sun/Moon) + the pure-parser/guarded-getter URL-gate pattern.

## Components

- [components/rfs-machine.md](components/rfs-machine.md) — RFS Trade Model state machine, prototype subset.
- [components/si-machine.md](components/si-machine.md) — Sales Intervention Trade Model state machine, `*Sent` ack delays, `Removed` cleanup.
- [components/deal-machine.md](components/deal-machine.md) — parent actor, cross-model coordination, context shape.
- [components/status-derivation.md](components/status-derivation.md) — `(rfsState, siState, dealable) → DisplayStatus` mapping.
- [components/pricing-feed.md](components/pricing-feed.md) — random-walk price simulator, Mulberry32 + Box-Muller, seedable.
- [components/deal-feed.md](components/deal-feed.md) — scenario-driven event emitter, state-gate bridge to the store.
- [components/scenario-player.md](components/scenario-player.md) — time-gated + state-gated follow-up dispatcher.
- [components/deals-store.md](components/deals-store.md) — Zustand store, machine spawning, archival to historic.
- [components/theme-store.md](components/theme-store.md) — **stable.** Zustand theme store (`dark` / `light`); `?theme=preview` resolution, force-dark when flag off, sole writer of `document.documentElement.dataset.theme`.
- [components/suggestion-engine.md](components/suggestion-engine.md) — **stable.** Deterministic rule engine, tier base + size + market + reason + behaviour deltas. Rationale builder + CREDIT_DECLINE_RATIONALE constant.
- [components/dev-injector.md](components/dev-injector.md) — *in-progress (v2).* Dev injector internals: dev-version scenario gating (`?dev=1` vs `?dev=v2`), compact labels (`Hold/Release`), and the v2 mobile `Dev ▾` popover (fixed positioning to escape the header overflow clip).
- [components/resize-handle.md](components/resize-handle.md) — *in-progress (v2).* Draggable blotter split (`?dev=v2`): the handle's `containerRef` live-read event contract paired with `App.tsx`'s grow-weighted-flex layout contract.
- [components/test-patterns.md](components/test-patterns.md) — recurring test patterns: seed pinning, fake timers for `*Sent`, hold-to-confirm interaction, harness pattern, `queueMicrotask` cleanup, cell-testid scoping, throwaway debug spec, `data-*` over text/color.

## Data models

- [data-models/deal.md](data-models/deal.md) — trade-economics payload.
- [data-models/deal-event.md](data-models/deal-event.md) — discriminated union of feed events.
- [data-models/price-tick.md](data-models/price-tick.md) — single price update shape.
- [data-models/client-profile.md](data-models/client-profile.md) — **stable.** Per-client tier + behaviour metadata; five seed profiles with Halcyon's neutral-prior acceptance rate.
- [data-models/margin-suggestion.md](data-models/margin-suggestion.md) — **stable.** Discriminated union: `kind: 'ready'` vs `kind: 'credit-decline'`. Panel-local `applied` and `computing` states separate from engine output.

## Decisions (ADRs)

- [decisions/ADR-0001-vite-react-tailwind.md](decisions/ADR-0001-vite-react-tailwind.md) — Vite + React 18 + Tailwind 3 over Next.js.
- [decisions/ADR-0002-two-parallel-state-machines.md](decisions/ADR-0002-two-parallel-state-machines.md) — RFS + SI as parallel machines, parent coordinates.
- [decisions/ADR-0003-xstate-zustand.md](decisions/ADR-0003-xstate-zustand.md) — XState v5 for deals, Zustand for UI / transient state.
- [decisions/ADR-0004-ag-grid-community.md](decisions/ADR-0004-ag-grid-community.md) — superseded; flex-row table replaced AG-Grid at FXSW-012.
- [decisions/ADR-0005-bake-reference-mids.md](decisions/ADR-0005-bake-reference-mids.md) — Frankfurter prebuild, hard-coded fallback.
- [decisions/ADR-0006-deterministic-suggestion-engine.md](decisions/ADR-0006-deterministic-suggestion-engine.md) — AI margin engine is a pure function, not a model call.
- [decisions/ADR-0007-credit-breach-recommend-decline.md](decisions/ADR-0007-credit-breach-recommend-decline.md) — credit-breach → recommend decline, not wider pricing.
- [decisions/ADR-0008-ai-indigo-accent.md](decisions/ADR-0008-ai-indigo-accent.md) — indigo-violet reserved exclusively for AI surfaces.
- [decisions/ADR-0009-simulated-ack-delays.md](decisions/ADR-0009-simulated-ack-delays.md) — 250ms `*Sent` delays kept, zero-able in tests.
- [decisions/ADR-0010-brand-neutral-product.md](decisions/ADR-0010-brand-neutral-product.md) — vendor names forbidden in shipped artifacts and (stricter) anywhere in the wiki layer.
- [decisions/ADR-0011-tailwind-rgb-variable-tokens.md](decisions/ADR-0011-tailwind-rgb-variable-tokens.md) — Tailwind colour utilities reference RGB-triple CSS variables via `rgb(var(--color-X) / <alpha-value>)` so themes flip via the cascade and opacity modifiers survive.

## Scenarios

- [scenarios/happy-path-esp.md](scenarios/happy-path-esp.md) — ESP flow-through. **Passing E2E (FXSW-013).**
- [scenarios/off-hours-intervention.md](scenarios/off-hours-intervention.md) — canonical SI happy path. **Passing E2E (FXSW-021).**
- [scenarios/credit-breach.md](scenarios/credit-breach.md) — AI credit-decline guardrail + trader reject. **Passing E2E (FXSW-027).**
- [scenarios/size-limit-margin-tune.md](scenarios/size-limit-margin-tune.md) — AI suggestion + Apply. **Passing E2E (FXSW-027).**
- [scenarios/release-path.md](scenarios/release-path.md) — release back to desk. **Passing E2E (FXSW-031, 0.7s).**

## Glossary

- [glossary.md](glossary.md) — FX market terms, Sales Intervention workflow terms, RFS + SI state names, blotter fields, prototype-only terms. Source: `docs/00-glossary.md`.
