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

The product is brand-neutral. **No vendor names anywhere in `wiki/` or `raw/`.** Page bodies, headings, frontmatter, code blocks, link text, URLs, file names. No exceptions, including for citation/research-grounding URLs. If a fact originated in a vendor doc, paraphrase it from the relevant in-repo `/docs/` file and cite that file instead. Industry-standard FX terminology (RFS, Sales Intervention, the canonical state names) is fine — those are not vendor-proprietary. Enforced per-write by rule §10 in `wiki/CLAUDE.md` and per-lint by a case-insensitive vendor-name grep over `wiki/` and `raw/` returning zero hits.

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
5. **ADR-0005:** Bake reference mids at build time via a public reference-rate API, no runtime fetch — see `docs/04-dummy-feed-spec.md` §10.
6. **ADR-0006:** AI Margin Suggestion as a deterministic rule engine, not a real model call — see `docs/09-suggestion-engine.md` §1.
7. **ADR-0007:** Credit-limit breach triggers AI Reject recommendation, not wider pricing — see `docs/09-suggestion-engine.md` §7.
8. **ADR-0008:** Indigo-violet accent reserved exclusively for AI surfaces — see `docs/05-ui-ux-spec.md` §1, §4.5.
9. **ADR-0009:** Simulated 250ms ack delays for `*Sent` SI states, not collapsed — see `docs/03-trade-state-model.md` §2, build-agent rule §8.
10. **ADR-0010:** Product is brand-neutral; vendor names forbidden in shipped artifacts — see build-agent rule §1.

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

The build agent's end-of-phase summary (per `KICKOFF-PROMPT.md`) is **structured input** for the wiki agent. **Per-project override (recorded Phase 0):** the summary lives at `docs/phase-summaries/FXSW-{phase-last-ticket-id}-summary.md`, not `raw/prs/`, so the build agent's write boundary stays strictly inside `docs/`. The wiki agent ingests from this path.

The build agent **never** writes to `wiki/`. The wiki agent **never** writes to `src/` or `tests/`.

## Wiki location decision

`/wiki` and `/raw` live at the repo root, sibling to `/src` and `/docs`. They're committed to the same git repo. Wiki diffs show up in PRs; commits prefixed `wiki:` (e.g., `wiki: ingest FXSW-013, update active-blotter component page`).
