# FX Sales Intervention — Prototype Doc Pack

A frontend prototype of Caplin's Sales Intervention (SI) screen, driven by a simulated pricing feed and a scenario injector. Built to showcase Claude Code's ability to deliver a polished, tested application from a structured spec pack in one week.

**Caplin source pages this doc pack is grounded in:**
- Overview: https://docs.caplin.com/developer/fx-sales/st-sales-intervention
- Architecture: https://docs.caplin.com/developer/fx-sales/st-sales-intervention-architecture
- User interface: https://docs.caplin.com/developer/fx-sales/st-sales-intervention-user-interface
- Implementation (state names + RFS↔SI relationships): https://docs.caplin.com/developer/fx-sales/st-implementing-sales-intervention

## Read order

| # | File | Purpose | Read before |
|---|------|---------|-------------|
| — | `CLAUDE.md` | Operational rules for Claude Code (build agent) | Always (auto-loaded) |
| — | `KICKOFF-PROMPT.md` | The first message to send the build agent | Session start |
| — | `BACKLOG.md` | 33 tickets, mapped to docs, with TDD test slates | Per ticket execution |
| — | `WIKI-SETUP.md` | Onboarding for the Wiki Agent (separate session) | Before first wiki run |
| — | `dev-wiki.md` | The dev-wiki methodology itself | Wiki Agent reads on every session |
| 00 | `00-glossary.md` | FX & SI terminology | Anything domain-touching |
| 01 | `01-prd.md` | Product requirements, scope, success criteria | All other docs |
| 02 | `02-functional-spec.md` | Screen-level behaviour | UI & state work |
| 03 | `03-trade-state-model.md` | RFS + SI state machines | Any state/store/reducer work |
| 04 | `04-dummy-feed-spec.md` | Pricing + deal simulator contract | Anything under `/src/services/feed/` |
| 05 | `05-ui-ux-spec.md` | Tokens, layout, interaction patterns | Anything visual |
| 06 | `06-tech-architecture.md` | Stack, folders, data flow | Scaffolding & wiring |
| 07 | `07-scenario-pack.md` | Named demo scenarios (Gherkin) | E2E tests, demo prep |
| 08 | `08-test-plan.md` | Test layering & acceptance criteria | Test work, CI setup |
| 09 | `09-suggestion-engine.md` | AI Margin Suggestion rule engine | Anything under `/src/services/suggestion/` or `SuggestionPanel.tsx` |

## How Claude Code should use these

1. Read `CLAUDE.md` and `00-glossary.md` at session start.
2. For any feature, read the docs in `Read before` for that area before writing code.
3. When the docs and reality diverge, **stop and ask** — do not silently re-interpret.
4. Mark the assumption explicitly in PR descriptions when a doc is silent on something.

## Scope reminder (the most important page)

This is a **one-week prototype with a dummy feed**. The reference product supports six ticket types, multiple connectors, and a full backend trade model. This prototype implements:

- Spot ticket only (Forward as stretch)
- Three rejection reasons (off-hours, size-limit breach, credit-limit breach)
- Manual rate entry + pip-based margin adjustment
- **AI Margin Suggestion panel** with Apply / Undo and credit-decline guardrail
- Send Stream + Send Quote + Withdraw + Release + Reject actions
- Visual + audible notifications with a mute toggle
- Active + Historic blotters with the 5-second removal rule
- Modern dark workstation aesthetic
- No auth, no persistence beyond session, no real WebSocket

Everything else is **out of scope** for v1.

## A note on branding

Product name in all user-visible strings: **FX Sales Workstation**. No vendor names anywhere in the shipped build (UI, README, package.json, source-map identifiers). This doc pack references upstream Caplin docs as research grounding only — those URLs are not shipped.
