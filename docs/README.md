# FX Sales Intervention — Prototype Doc Pack

A frontend prototype of an FX sales manual-pricing intervention workstation, driven by a simulated pricing feed and a scenario injector. Built to showcase Claude Code's ability to deliver a polished, tested application from a structured spec pack in one week.

## Read order

| # | File | Purpose | Read before |
|---|------|---------|-------------|
| — | `CLAUDE.md` | Operational rules for Claude Code | Always |
| — | `KICKOFF-PROMPT.md` | First message to send the build agent | Session start |
| — | `BACKLOG.md` | Tickets mapped to docs and test slates | Per-ticket execution |
| — | `WIKI-SETUP.md` | Wiki Agent onboarding | Before first wiki run |
| — | `dev-wiki.md` | Dev-wiki methodology | Wiki Agent reads on every session |
| 00 | `00-glossary.md` | FX & sales-intervention terminology | Anything domain-touching |
| 01 | `01-prd.md` | Product requirements, scope, success criteria | All other docs |
| 02 | `02-functional-spec.md` | Screen-level behaviour | UI & state work |
| 03 | `03-trade-state-model.md` | RFS + SI state machines | State/store/reducer work |
| 04 | `04-dummy-feed-spec.md` | Pricing + deal simulator contract | `/src/services/feed/` |
| 05 | `05-ui-ux-spec.md` | Tokens, layout, interaction patterns | Visual work |
| 06 | `06-tech-architecture.md` | Stack, folders, data flow | Scaffolding & wiring |
| 07 | `07-scenario-pack.md` | Named demo scenarios | E2E tests, demo prep |
| 08 | `08-test-plan.md` | Test layering & acceptance criteria | Test work, CI setup |
| 09 | `09-suggestion-engine.md` | AI Margin Suggestion rule engine | Suggestion service/panel |
| 10 | `10-security-agent-spec.md` | Independent end-of-phase Security Agent | Phase close (Phase 9+) |
| — | `future-enhancements/` | Production-readiness spec + phased backlog (parked, placeholder numbering) | When the prototype→production hardening track is scheduled |

## How Claude Code should use these

1. Read `CLAUDE.md` and `00-glossary.md` at session start.
2. For any feature, read the docs listed in the relevant ticket's “Read before” section.
3. When docs and implementation reality diverge, stop and ask rather than silently reinterpreting.
4. Mark assumptions explicitly in PR descriptions when a doc is silent on something.

## Scope reminder

This is a **one-week frontend prototype with a dummy feed**. It implements:

- Spot ticket only
- Three manual-pricing reasons: off-hours, size-limit breach, credit-limit breach
- Manual rate entry + pip-based margin adjustment
- AI Margin Suggestion panel with Apply / Undo and credit-decline guardrail
- Send Stream + Send Quote + Withdraw + Release + Reject actions
- Visual + audible notifications with a mute toggle
- Active + Historic blotters with the 5-second removal rule
- Modern dark workstation aesthetic
- No auth, no persistence beyond session, no real WebSocket

Everything else is **out of scope** for v1.

## Branding

Product name in all user-visible strings: **FX Sales Workstation**. No vendor names should appear anywhere in committed docs, source, package metadata, build output, wiki/raw content, or user-visible UI.
