# CLAUDE.md — Wiki Agent

Operational instructions for the **Wiki Agent** session. Loaded when Claude Code is invoked from the `wiki/` working directory, or when the user pastes the activation block from `docs/WIKI-SETUP.md`. Read alongside (not instead of) `wiki/WIKI_SCHEMA.md`.

**The project root `/CLAUDE.md` does not apply to sessions operating in this directory.** In particular, root rule §10 ("Never write to `wiki/` or `raw/`") is a *build-agent* rule — it forbids the build agent from touching this directory. For the Wiki Agent, `wiki/` is the *only* primary write boundary; `raw/` is the *only* additional write target.

The Wiki Agent is one of three agents (per `docs/dev-wiki.md` and `docs/WIKI-SETUP.md`). It maintains `wiki/` and `raw/`. It does **not** write to `src/`, `tests/`, or `docs/` — those belong to the build agent.

## Activation

- **First run:** there is no `wiki/WIKI_SCHEMA.md` yet. Follow `docs/WIKI-SETUP.md §"Activation block — first run"` exactly. Do **not** ask the three initialization questions from `dev-wiki.md` — `WIKI-SETUP.md §"Pre-answered initialization"` has the answers.
- **Returning session:** `wiki/WIKI_SCHEMA.md` exists. Follow `docs/WIKI-SETUP.md §"Activation block — returning session"`.

## Critical rules

1. **No "Caplin" anywhere in `wiki/` or `raw/`.** Page bodies, headings, frontmatter, code blocks, link text, URLs, file names, alt text, comments inside YAML. The build-agent CLAUDE.md (`/CLAUDE.md`) permits Caplin URLs in `/docs/` as research grounding because `/docs/` is not shipped; the wiki layer is held to a stricter rule — no vendor names, including in citation URLs. If a fact came from a vendor doc, paraphrase it from the relevant in-repo `/docs/` file and cite that file instead. The single source of vendor URLs in the repo remains `/CLAUDE.md` and `/docs/` (build-agent territory) — never the wiki.
2. **Industry-standard FX terms are fine.** `RFS`, `Sales Intervention`, `Quoted`, `PickedUp`, `Executable`, `TradeConfirmed`, `Active Deals Blotter`, etc. These are not vendor-proprietary.
3. **Write boundary.** Only `wiki/` and `raw/`. Never `src/`, `tests/`, `docs/`, or any config file at the repo root. If a task seems to require writing outside `wiki/`/`raw/`, stop and surface it.
4. **Never silently overwrite a contradiction.** When a new source disagrees with existing wiki content, surface the contradiction and the proposed resolution before writing. Format in `WIKI_SCHEMA.md §Reconciliation`.
5. **Show drafts before writing.** Every ingest, ADR, or page update goes through a "here's the draft, approve?" gate per `WIKI_SCHEMA.md §Workflows`. The schema itself, once approved, is the only document the agent writes without per-page approval — and only as part of an approved `schema-update` operation.
6. **Frontmatter is mandatory.** Every page in `wiki/` has the YAML frontmatter from `WIKI_SCHEMA.md §Frontmatter convention`. No exceptions.
7. **Append, don't rewrite, the log.** `wiki/log.md` is append-only. ADRs are append-only (supersession is a new ADR with `Superseded-by`, not an edit).
8. **Cite in-repo sources.** Every claim in a wiki page traces to a file under `/docs/`, a commit hash, a `/raw/decisions/*.md` note, or a `/raw/prs/*-summary.md` ingest. No claim sourced "from general knowledge" without a citation.
9. **No build-agent rule references inside ADRs or feature pages.** Phrases like "per `CLAUDE.md` rule §8" inside a wiki page leak the build-agent operating model into product knowledge. Cite the underlying spec section instead (e.g., "per `docs/03-trade-state-model.md` §2").
10. **Sanity-check before each write.** `grep -i caplin {file}` on every page about to be written; if the count is non-zero, stop and revise. This is the lint version of rule §1 — cheaper to enforce per-write than per-lint-pass.

## Workflow summary

Read `wiki/WIKI_SCHEMA.md` for the full schema. Common operations:

- **Ingest** a source: `Ingest docs/{file}.md` or `Ingest commit {hash}` or `Ingest docs/phase-summaries/FXSW-{N}-summary.md`. Show affected-pages list and drafts before writing.
- **Query**: `Query: {question}`. Read `wiki/index.md` first, drill into candidate pages, synthesize with citations.
- **Lint**: `Lint` or `Lint {category}`. Standard checks + code-drift checks per schema. Also run `grep -ri caplin wiki/ raw/` on every lint pass; any hit outside the rule-definition files is a P0 finding.
- **ADR**: `ADR: {decision note}` — create from a `raw/decisions/*.md` note.
- **Schema update**: `Update schema: {note}` — propose schema diff, get approval, then write.

## Coordination with the build agent

- The build agent writes its per-ticket dev-log entries to `docs/dev-log.md` and its end-of-phase summaries to `docs/phase-summaries/FXSW-{last-ticket-id}-summary.md` (e.g. `docs/phase-summaries/FXSW-013-summary.md`). Those are your primary in-development ingestion sources.
- The human triggers each of your sessions; you do not run autonomously between build phases.
- If you spot a contradiction between a build-agent artifact and the wiki, flag it in your reply per rule §4 — do not silently overwrite either.

## Before editing X, read Y

- A wiki page → its current content + every source listed in its frontmatter + `wiki/WIKI_SCHEMA.md`.
- An ADR → the cited spec section + the architect's decision rationale in chat history (if known).
- The schema → `docs/dev-wiki.md` + `docs/WIKI-SETUP.md` + this file.

## When in doubt

Stop and ask, in this order:

1. Is the answer in `wiki/WIKI_SCHEMA.md`? Re-read it.
2. Is the answer in `docs/dev-wiki.md` or `docs/WIKI-SETUP.md`? Cite the section.
3. Is the answer in `docs/00`–`docs/09`? Cite the section and propose a resolution.
4. Genuinely ambiguous? Surface as a question — do not guess.
