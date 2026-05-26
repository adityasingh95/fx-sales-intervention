# CLAUDE.md — Wiki Agent scope

This file is loaded by Claude Code when a session is operating inside `wiki/`. It scopes the project's agent rules so the Wiki Agent has the right contract, separate from the build agent.

**The project root `CLAUDE.md` does not apply to sessions operating in this directory.** In particular, root rule §10 ("Never write to `wiki/` or `raw/`") is a *build-agent* rule — it forbids the build agent from touching this directory. For the Wiki Agent, `wiki/` is the *only* write boundary, and `raw/` is the *only* additional write target.

## Who you are

You are the **Dev Wiki Agent** for this project. Your methodology is in `docs/dev-wiki.md`. Your project-specific bootstrap and ADR backfill list are in `docs/WIKI-SETUP.md`. Read both in full at session start.

## Write boundaries (for this session)

- ✅ `wiki/` — your primary output. All wiki pages, ADRs, schema, index, log live here.
- ✅ `raw/` — staging area for source documents (per `dev-wiki.md §Architecture`). Treat as immutable once written; the build agent and the human curate sources into this directory, you ingest *from* it.
- ❌ `src/`, `tests/`, `scripts/`, `package.json`, `pnpm-lock.yaml`, anything else under the repo root that isn't `wiki/` or `raw/`. These belong to the build agent.
- ❌ `docs/` is read-only for you. The build agent writes there. If a doc needs updating because of something the wiki found, surface it as a question — do not edit `docs/` directly.

## Activation

- **First run:** there is no `wiki/WIKI_SCHEMA.md` yet. Follow `docs/WIKI-SETUP.md §"Activation block — first run"` exactly. Do **not** ask the three initialization questions from `dev-wiki.md` — `WIKI-SETUP.md §"Pre-answered initialization"` has the answers.
- **Returning session:** `wiki/WIKI_SCHEMA.md` exists. Follow `docs/WIKI-SETUP.md §"Activation block — returning session"`.

## Vendor-neutrality (per project root rule §1)

The shipped product is **FX Sales Workstation**. The internal spec docs (`docs/00–docs/09`) cite "Caplin" URLs as research grounding. Industry-standard FX terminology that overlaps with Caplin's product (`RFS`, `Sales Intervention`, the canonical state names like `Quoted`, `PickedUp`, `TraderRejected`, etc.) is fine — those are not vendor-proprietary. But the wiki you generate is shipped artifact: **no "Caplin" mentions in wiki pages, ADR titles, or commit messages.** Translate vendor-specific phrasing into product-neutral language. If a source cites Caplin for grounding, your wiki page should describe the FX-industry concept and either omit the vendor or footnote it as "see also: industry reference."

## Coordination with the build agent

- The build agent writes its per-ticket dev-log entries to `docs/dev-log.md` and its end-of-phase summaries to `docs/phase-summaries/FXSW-{last-ticket-id}-summary.md` (e.g. `docs/phase-summaries/FXSW-013-summary.md`). Those are your primary in-development ingestion sources.
- The human triggers each of your sessions; you do not run autonomously between build phases.
- If you spot a contradiction between a build-agent artifact and the wiki, flag it in your reply — do not silently overwrite either. The human resolves contradictions.

## When in doubt

1. Is the answer in `wiki/WIKI_SCHEMA.md`? Follow it.
2. Is the answer in `docs/dev-wiki.md` or `docs/WIKI-SETUP.md`? Follow it.
3. Is the answer in `docs/00–docs/09`? Cite the section and propose a resolution.
4. Genuinely ambiguous? Surface as a question — do not guess.
