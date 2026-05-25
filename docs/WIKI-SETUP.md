# WIKI-SETUP.md

Onboarding doc for the **Wiki Agent** (the third agent, per `dev-wiki.md`). This file lets the wiki agent skip the three-question initialization and proceed directly to schema review + first ingest, because all the answers are project-specific knowledge that already exists.

## The three-agent setup

| Agent | Session | Role | Reads | Writes |
|---|---|---|---|---|
| **Build agent** | Claude Code window #1 | Implements backlog tickets, writes code, runs tests | `docs/`, `src/` | `src/`, `tests/` |
| **You** | Chat with me, or direct | Approve phase gates, make scope calls, route work | All | `docs/` (occasionally) |
| **Wiki agent** | Claude Code window #2 | Maintains synthesized product knowledge | `docs/`, `raw/`, `src/` (read-only via git/grep) | `wiki/` |

The wiki agent and build agent **must not share a session.** They have separate working memories and separate write boundaries. The build agent never writes to `wiki/`; the wiki agent never writes to `src/`.

## Pre-answered initialization

The dev-wiki pattern asks three questions on first run. Answers for this project:

**Q1: What is this project called and what does it do in one sentence?**

> **FX Sales Workstation** — a frontend prototype of a sales-trader workstation for FX manual pricing intervention, with simulated pricing and an AI-assisted margin suggestion.

**Q2: What initial sources do I have ready to ingest?**

The full spec pack at `/docs/` — 14 markdown files covering glossary, PRD, functional spec, state model, dummy feed, UI spec, tech architecture, scenarios, test plan, AI suggestion engine, backlog, kickoff prompt, README, and the dev-wiki methodology itself. Ingest in numerical order; treat `BACKLOG.md` last (it spans all of them).

**Q3: Where should the wiki live?**

A `/wiki` subdirectory of the repo. Version-aligns with code automatically; PR-visible. Same for `/raw/` (sibling to `/wiki`).

## Pre-drafted WIKI_SCHEMA.md

Wiki agent: on first run, draft `wiki/WIKI_SCHEMA.md` using the content below as the starting point. Show me the draft, accept my adjustments, then write it.

```markdown
# Wiki Schema — FX Sales Workstation

## Project

- **Name:** FX Sales Workstation
- **Type:** Single-page frontend prototype, 1-week build
- **Stack:** Vite + React 18 + TypeScript (strict) + Tailwind + Zustand + XState v5 + AG-Grid + Vitest + Playwright
- **Code root:** `/src`
- **Test root:** `/tests`
- **Spec source-of-truth:** `/docs` (treat as raw/specs equivalent)
- **Raw new sources:** `/raw/decisions`, `/raw/prs`, `/raw/transcripts`

## Vendor neutrality rule

The product is brand-neutral. No vendor names — including "Caplin" — in any wiki page that an external reader might see. The wiki may reference upstream Caplin docs as research grounding when citing sources, but the product description, the feature pages, the onboarding, the glossary all use only the industry-standard FX terminology.

## Page categories

| Category | Path | Examples |
|---|---|---|
| Overview | `wiki/overview.md` | One page, always current |
| Features | `wiki/features/` | active-blotter, historic-blotter, ticket, ai-margin-suggestion, notifications, dev-injector |
| Components | `wiki/components/` | pricing-feed, deal-feed, scenario-player, deal-machine, rfs-machine, si-machine, suggestion-engine, status-derivation |
| Data models | `wiki/data-models/` | deal, client-profile, margin-suggestion, price-tick, deal-event, rejection-reason |
| Decisions (ADRs) | `wiki/decisions/` | One per architectural decision. Backfill the pre-build decisions on initialization (see §Initial ADRs below). |
| Scenarios | `wiki/scenarios/` | happy-path-esp, off-hours-intervention, credit-breach, size-limit-margin-tune, release-path |
| Glossary | `wiki/glossary.md` | One page; merged FX + Sales-Intervention + prototype terminology |
| Onboarding | `wiki/onboarding.md` | Synthesized "new engineer joining Monday" guide |

## Frontmatter convention (every page)

```yaml
---
last_updated: 2026-05-25
sources:
  - docs/03-trade-state-model.md
  - raw/prs/FXSW-010-cross-model-coordination.md
status: stable | in-progress | superseded
ticket: FXSW-010   # optional, for traceability
---
```

Status values: `stable` (page reflects current state), `in-progress` (build still landing), `superseded` (kept for history with a Superseded-by link).

## Initial ADRs (backfill on first ingest)

Several architectural decisions were made before the build started; their rationale lives in the chat history with the architect. The wiki agent should create the following ADRs as part of initialization, drafting from `docs/06-tech-architecture.md`, `docs/01-prd.md` §10, `docs/05-ui-ux-spec.md`, and `docs/03-trade-state-model.md`:

1. **ADR-0001:** Vite + React + Tailwind over Next.js — see `docs/01-prd.md` §10 references; rationale in chat history with architect.
2. **ADR-0002:** Two parallel state machines (RFS + SI) per deal — see `docs/03-trade-state-model.md` §6 ("Why two machines, not one combined").
3. **ADR-0003:** XState v5 for deal lifecycle, Zustand for UI/transient state — see `docs/06-tech-architecture.md` §5.
4. **ADR-0004:** AG-Grid Community over TanStack Table — see `docs/01-prd.md` §9 Q1.
5. **ADR-0005:** Bake reference mids at build time via Frankfurter, no runtime fetch — see `docs/04-dummy-feed-spec.md` §10.
6. **ADR-0006:** AI Margin Suggestion as a deterministic rule engine, not a real model call — see `docs/09-suggestion-engine.md` §1.
7. **ADR-0007:** Credit-limit breach triggers AI Reject recommendation, not wider pricing — see `docs/09-suggestion-engine.md` §7.
8. **ADR-0008:** Indigo-violet accent reserved exclusively for AI surfaces — see `docs/05-ui-ux-spec.md` §1, §4.5.
9. **ADR-0009:** Simulated 250ms ack delays for `*Sent` SI states, not collapsed — see `docs/03-trade-state-model.md` §2, `CLAUDE.md` critical rule §8.
10. **ADR-0010:** Product is brand-neutral; vendor names forbidden in shipped artifacts — see `CLAUDE.md` critical rule §1.

Each ADR follows the standard format: Context · Options considered · Decision · Consequences. The ADR is dated as of the build start, with `status: stable`.

## Workflows

### Ingest

1. Read the source end-to-end.
2. Identify affected wiki pages (use `wiki/index.md` to find candidates).
3. **Show me the proposed updates before writing.** List each affected page with a 1-line summary of the change.
4. After I approve, apply the updates. Update cross-references. Update glossary if new terms appeared.
5. Append a `[YYYY-MM-DD] ingest | {source}` line to `wiki/log.md`.

For long sources (a full spec doc, an hour-long meeting), first produce a compressed summary in `raw/` next to the original, then drive wiki updates from the summary.

### Query

1. Read `wiki/index.md` to find candidate pages.
2. Read those pages and synthesize an answer with citations.
3. Append a `[YYYY-MM-DD] query | {question}` line to `wiki/log.md`.
4. If the answer is non-trivial, propose filing it as a new wiki page (analysis, comparison, dependency map).

### Lint

Run after every phase E2E gate passes (FXSW-013, -021, -027, -031, full suite at FXSW-033) and on demand.

Standard checks:
- Contradictions across pages.
- Orphan pages (no inbound links).
- Concepts that appear in 3+ pages without a page of their own.
- Broken cross-references and stale `Superseded-by` links.
- Missing ADRs for decisions visible in chat history or git log but not yet recorded.

**Code-drift checks (project-specific — single biggest reliability lever):**
- **State names:** Every state in `wiki/components/si-machine.md` and `wiki/components/rfs-machine.md` matches the states actually defined in `src/state/machines/siMachine.ts` and `rfsMachine.ts`. Use `grep` and `git show`.
- **Dependencies:** Versions in `wiki/components/*.md` "Dependencies" sections match `package.json` exactly.
- **Scenario data:** Each `wiki/scenarios/*.md` page's client/account/pair/notional/reasons match `src/services/scenarios/definitions.ts`.
- **Client profiles:** `wiki/data-models/client-profile.md` table matches `src/services/suggestion/clientProfiles.ts`.
- **Suggestion engine deltas:** Each pip-delta value in `wiki/components/suggestion-engine.md` matches the constant in `src/services/suggestion/engine.ts`. This is the most drift-prone area.
- **Test contract:** `data-testid`, `data-si-state`, `data-rfs-state`, `data-dealable` attributes mentioned in `wiki/features/*.md` are actually present in the corresponding component source.
- **Reference mids freshness:** `src/services/feed/referenceMids.json` was regenerated within the last 90 days.
- **Backlog completion:** Every ticket marked ☑ in `docs/BACKLOG.md` has a corresponding commit in git log AND a wiki entry (component, feature, or ADR page) reflecting the change.

When drift is found: **surface it to me before resolving.** Describe the contradiction. Propose: update the wiki page, or escalate to the build agent if the code is wrong.

### Reconciliation

When a new source contradicts existing wiki content: stop and ask. Never silently overwrite. Format:

> Found contradiction: `wiki/components/suggestion-engine.md` claims off-hours adds +2 pips; `raw/prs/FXSW-023-engine.md` (today) implements +1.5. Proposed: update the wiki page to +1.5 and add a note in the ADR-0006 consequences section. Approve?

### Schema updates

When a new page category or convention is needed (e.g., we add an "operations" category for runbook-style pages): propose an edit to this schema file, get my approval, then proceed.

## Log format

Append-only, one line per operation:

```
## [2026-05-25] ingest | FXSW-005 commit a3f2c81 — state machine skeletons
## [2026-05-25] query  | Which features depend on the suggestion engine?
## [2026-05-26] lint   | Phase 2 gate — code-drift check, 0 issues
## [2026-05-27] adr    | ADR-0011 — chose nanoid over uuid for dealId
```

Operations: `ingest`, `query`, `lint`, `adr`, `schema-update`, `reconcile`.

`grep "^## \[" wiki/log.md | tail -20` gives recent activity.

## Cadence (this project)

| Trigger | Action | Initiated by |
|---|---|---|
| First run | Ingest all 14 docs in `docs/`; create initial ADRs (the 10 above); produce initial overview, glossary, onboarding | Me (you), once |
| End of each backlog phase | Ingest the phase's commits (`git log` between gates), run lint, update affected pages | Me, manually after E2E gate passes |
| Architect–build clarifications | Ingest the decision note (save to `raw/decisions/` first) | Me, when a chat clarification changes a spec |
| Ad hoc | Query | Me, as questions arise |

## Hand-off contract with the build agent

The build agent's end-of-phase summary (per `KICKOFF-PROMPT.md`) is **structured input** for the wiki agent. Save the summary to `raw/prs/FXSW-{phase}-summary.md` before invoking the wiki agent. The wiki agent then has a single authoritative source to ingest, alongside the actual commits.

The build agent **never** writes to `wiki/`. The wiki agent **never** writes to `src/` or `tests/`.

## Wiki location decision

`/wiki` and `/raw` live at the repo root, sibling to `/src` and `/docs`. They're committed to the same git repo. Wiki diffs show up in PRs; commits prefixed `wiki:` (e.g., `wiki: ingest FXSW-013, update active-blotter component page`).
```

(End of WIKI_SCHEMA.md content.)

## Activation block — first run

Paste this as the wiki agent's **first message** in a fresh Claude Code session (separate from the build session):

```
You are the Dev Wiki Agent for this project. Your methodology is in
docs/dev-wiki.md (read in full) and the project-specific bootstrap is
in docs/WIKI-SETUP.md (read in full).

On startup, do the following:

1. Confirm there is no wiki/WIKI_SCHEMA.md yet. If there is, switch to
   the returning-session prompt instead.

2. Read docs/dev-wiki.md and docs/WIKI-SETUP.md in full. Acknowledge
   you understand:
   - The three-agent setup and write boundaries.
   - The pre-answered initialization (don't ask the three questions).
   - The pre-drafted WIKI_SCHEMA.md content.
   - The 10 initial ADRs to backfill.
   - The vendor-neutrality rule.

3. Draft wiki/WIKI_SCHEMA.md using the pre-drafted content in
   WIKI-SETUP.md §Pre-drafted WIKI_SCHEMA.md. Show me the draft.
   Do not write it yet.

4. After I approve, in order:
   - Create directory structure: wiki/, wiki/features/,
     wiki/components/, wiki/data-models/, wiki/decisions/,
     wiki/scenarios/, wiki/assets/, raw/, raw/decisions/,
     raw/prs/, raw/transcripts/.
   - Write wiki/WIKI_SCHEMA.md.
   - Create empty wiki/index.md and wiki/log.md.
   - Write a stub wiki/overview.md from docs/01-prd.md §1, §3.

5. Do the first real ingest end-to-end: docs/00-glossary.md.
   Show me the resulting wiki/glossary.md before writing. After approval,
   write it, update wiki/index.md, append to wiki/log.md.

6. Pause and ask if you should continue with the remaining docs/ files,
   or if I want to review the workflow first.

Stop when you have done steps 1-6.
```

## Activation block — returning session

```
You are the Dev Wiki Agent for this project. Resume from current state.

On startup:
1. Read wiki/WIKI_SCHEMA.md silently.
2. Read wiki/index.md.
3. Read the last 10 entries of wiki/log.md.
4. Confirm in one line: project name, page count, most recent log entry.
5. Wait for my command.

Accepted commands:
  Ingest <source>         — process a file and update the wiki
  Query: <question>       — synthesize an answer from wiki content
  Lint                    — full health check + code-drift check
  Lint <category>         — lint a specific category (components, scenarios, etc.)
  ADR: <decision note>    — create an ADR from a decision note in raw/decisions/
  Show index              — print wiki/index.md
  Show log [n]            — print last n log entries (default 10)
  Update schema: <note>   — propose a schema change

All operations follow WIKI_SCHEMA.md. When the schema is wrong or
incomplete, propose updating it before proceeding.
```

## Initial source list (for the first-run ingest, after step 5)

Order matters — earlier sources establish vocabulary that later sources use.

1. `docs/00-glossary.md` → `wiki/glossary.md` (step 5 of first-run)
2. `docs/01-prd.md` → updates `wiki/overview.md`; seeds `wiki/features/` index
3. `docs/02-functional-spec.md` → creates `wiki/features/active-blotter.md`, `historic-blotter.md`, `ticket.md`, `notifications.md`, `dev-injector.md`
4. `docs/03-trade-state-model.md` → creates `wiki/components/rfs-machine.md`, `si-machine.md`, `deal-machine.md`, `status-derivation.md`; backfills ADR-0002, ADR-0009
5. `docs/04-dummy-feed-spec.md` → creates `wiki/components/pricing-feed.md`, `deal-feed.md`, `scenario-player.md`; data-models for `price-tick.md`, `deal-event.md`; backfills ADR-0005
6. `docs/05-ui-ux-spec.md` → seeds visual conventions section in each feature page; backfills ADR-0008
7. `docs/06-tech-architecture.md` → backfills ADR-0001, ADR-0003, ADR-0004
8. `docs/07-scenario-pack.md` → creates `wiki/scenarios/happy-path-esp.md` and four more
9. `docs/08-test-plan.md` → "Testing" section in `wiki/onboarding.md`; "Test contract" subsection in affected component pages
10. `docs/09-suggestion-engine.md` → creates `wiki/components/suggestion-engine.md`, `wiki/data-models/client-profile.md`, `wiki/data-models/margin-suggestion.md`, `wiki/features/ai-margin-suggestion.md`; backfills ADR-0006, ADR-0007
11. `docs/BACKLOG.md` → seeds `wiki/onboarding.md` "Build progression" section; informs frontmatter `ticket` fields on component/feature pages
12. `docs/README.md` and `docs/CLAUDE.md` and `docs/KICKOFF-PROMPT.md` → reference only; backfills ADR-0010 (brand neutrality)
13. `docs/dev-wiki.md` → reference only (this is the wiki agent's own methodology)

After all 13 are ingested, run a full lint pass (no code yet, so code-drift checks will report "no source to compare against — defer" for those checks). Then write `wiki/onboarding.md` as the final synthesis.

## Trigger points during the build

| When | What |
|---|---|
| After phase 1 gate (FXSW-006 done) | Ingest the phase's commits + scaffolding decisions. New ADR if scaffolding diverged from the architecture doc. Lint. |
| After phase 2 gate (FXSW-013 E2E green) | Ingest the phase's commits. Update feed + state-machine component pages. Lint with code-drift on state machines. |
| After phase 3 gate (FXSW-021 E2E green) | Ingest. Update ticket feature page, all panel component pages. Lint with code-drift on test attributes. |
| After phase 4 gate (FXSW-027 E2E green) | Ingest. Update AI suggestion pages. Code-drift on pip-delta values in `engine.ts` ↔ wiki. |
| After phase 5 gate (FXSW-033 done) | Ingest final polish + README. Full lint. Update onboarding.md with everything we learned. Optional: write a brief "post-mortem" page. |
| Any architect–build clarification that changes a spec | Save the decision note to `raw/decisions/`, then invoke. May produce a new ADR. |

## How to know it's working

After the first full ingest, a new engineer should be able to open `wiki/onboarding.md` cold and within 30 minutes understand: the product, the architecture, the state model, the AI suggestion logic, where things live in the repo, and the demo scenarios. If they can't, the wiki agent's first pass needs another iteration before the build starts.
