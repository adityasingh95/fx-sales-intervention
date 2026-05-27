# BACKLOG.md

Brand-neutral implementation backlog for **FX Sales Workstation**.

This sanitized backlog preserves the completed ticket map and current delivery status without retaining vendor-specific wording from earlier research notes.

## Working rules

- Work tickets in order within a phase.
- Use the ticket ID in commit messages.
- Keep docs, tests, and implementation aligned.
- Do not add vendor names anywhere in committed files or generated output.
- Do not edit `src/` from documentation-cleanup tasks unless explicitly approved.

## TDD intensity legend

| Mark | Meaning |
|---|---|
| **Strict** | Tests first, red → green, then refactor. |
| **Alongside** | Component API and behaviour tests written with implementation. |
| **Acceptance** | E2E/acceptance scenario validates the flow. |

## Summary

| ID | Title | Phase | Status |
|---|---|---|---|
| FXSW-001 | Project scaffolding | 1 | Done |
| FXSW-002 | Design tokens + Tailwind config | 1 | Done |
| FXSW-003 | Folder structure | 1 | Done |
| FXSW-004 | Prebuild reference-mids script | 1 | Done |
| FXSW-005 | State machine skeletons | 1 | Done |
| FXSW-006 | AppShell + Header + empty blotter | 1 | Done |
| FXSW-007 | PricingFeed with seeded RNG | 2 | Done |
| FXSW-008 | DealFeed + scenario player | 2 | Done |
| FXSW-009 | dealsStore + machine spawning | 2 | Done |
| FXSW-010 | dealMachine cross-model coordination | 2 | Done |
| FXSW-011 | statusFromMachines derivation | 2 | Done |
| FXSW-012 | Active Blotter live + 5s removal + Historic | 2 | Done |
| FXSW-013 | DevInjector + HAPPY_PATH_ESP E2E | 2 | Done |
| FXSW-014 | TicketPanel shell + glass overlay | 3 | Done |
| FXSW-015 | ReasonsPanel | 3 | Done |
| FXSW-016 | Summary + DealSummary panels | 3 | Done |
| FXSW-017 | PricingPanel streaming mode | 3 | Done |
| FXSW-018 | PricingPanel fixed mode + margin controls | 3 | Done |
| FXSW-019 | ClientSummaryPanel | 3 | Done |
| FXSW-020 | TicketFooter + acknowledgement flow | 3 | Done |
| FXSW-021 | OFF_HOURS_INTERVENTION E2E | 3 | Done |
| FXSW-022 | Client profile seed data | 4 | Done |
| FXSW-023 | Suggestion engine | 4 | Done |
| FXSW-024 | Rationale builder | 4 | Done |
| FXSW-025 | SuggestionPanel ready / applied / Undo | 4 | Done |
| FXSW-026 | SuggestionPanel credit-decline + recompute | 4 | Done |
| FXSW-027 | SIZE_LIMIT + CREDIT_BREACH E2E | 4 | Done |
| FXSW-028 | Notifications visual layer | 5 | Done |
| FXSW-029 | Audio chime + mute + settingsStore | 5 | Done |
| FXSW-030 | Visual polish pass | 5 | Done |
| FXSW-031 | RELEASE_PATH E2E | 5 | Done |
| FXSW-032 | CI workflow | 5 | Done |
| FXSW-033 | README + demo recording placeholder | 5 | Partial |
| FXSW-034 | GitHub Pages deploy workflow | 5 | Done, pulled forward in Phase 1 |

## Phase summaries

### Phase 1 — Scaffold + first slice

Established the React/Vite/TypeScript application, tokens, folder structure, initial state-machine skeletons, AppShell, and deployment workflow.

### Phase 2 — Feed + state coordination

Added deterministic pricing feed, scenario-driven deal feed, state store, parent/child state-machine coordination, derived blotter statuses, Active/Historic blotters, Dev Injector, and Happy Path ESP E2E coverage.

### Phase 3 — Ticket panels + actions

Added the ticket overlay, Reasons/Summary/Deal Summary/Pricing/Client Summary panels, footer actions, acknowledgement flows, and OFF_HOURS_INTERVENTION E2E coverage.

### Phase 4 — AI Margin Suggestion

Added client profiles, deterministic suggestion engine, rationale builder, suggestion panel states, credit-decline guardrail, and E2E coverage for credit and margin-tune scenarios.

### Phase 5 — Notifications + polish + ship

Added toasts, title flash, row flash, audio chime, mute persistence, shared button primitives, visual polish, release-path E2E, CI workflow, and README/demo packaging.

## Current known follow-ups

- Capture and attach the actual demo recording if needed.
- Keep CI and deployment badges current.
- Preserve brand-neutrality across docs, source, wiki, PR text, and build output.
- If a full repository-history cleanup is required, perform a local history rewrite rather than only editing current files.
