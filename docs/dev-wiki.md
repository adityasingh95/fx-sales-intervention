# Dev Wiki

A pattern for building a living product knowledge base, maintained by an LLM agent alongside development.

**How to use this file:** Add it as context at the start of any new project. The agent will initialize a fresh wiki for that project on first run and maintain it as you prompt it with new work. The agent reads this file once and then operates entirely through the project's own schema file — this document is only needed to bootstrap a new project.

---

## The core idea

Every non-trivial software product accumulates documentation debt. There's a PRD written before code existed. An architecture spec that was accurate at v1 and is now mostly aspirational. A folder of RFCs and ADRs in various states of staleness. Slack threads where real decisions were made. PR descriptions that explain *why* a change happened — descriptions that vanish from anyone's working memory the moment the PR merges. The result is that the only authoritative source of truth becomes the code itself, and the only way to understand anything is to read it or ask the person who wrote it.

The standard fix is "we should write better docs," and it never works, because the bottleneck isn't writing — it's *maintenance*. Updating cross-references, reconciling contradictions when a new ADR supersedes an old one, keeping the component page current when an API changes. Humans abandon wikis because the burden grows faster than the value.

The idea here is to flip that. Instead of humans writing and maintaining the wiki, the LLM does. You feed it sources — the initial PRD, architecture spec, design docs, then ongoing artifacts as development happens (merged PRs, design changes, post-mortems, meeting notes) — and it incrementally builds and maintains a structured, interlinked wiki that reflects the current state of the product.

This is different from RAG over a docs folder. RAG retrieves chunks at query time and re-derives the answer every time. The wiki is a *persistent, compounding artifact*. The cross-references are already there. The contradictions have already been flagged. The component page already reflects last week's API change. When a new engineer joins, they don't dig through documentation archaeology — they read the wiki.

You never write the wiki yourself. You curate sources, ask questions, and prompt updates. The LLM does all the bookkeeping — the summarizing, cross-referencing, filing, and lint passes — that nobody on the team wants to do.

---

## Architecture

**Raw sources** — your curated collection of source documents. PRDs, architecture specs, RFCs, ADRs, design docs, exported Slack threads, meeting transcripts, PR descriptions, customer interviews, support tickets, bug reports, diagrams. These are immutable. The LLM reads from them but never modifies them. This is your evidence base.

**The wiki** — a directory of LLM-generated markdown files. Feature pages, component pages, API pages, data-model pages, ADRs, a glossary, an index, a synthesis. The LLM owns this layer entirely. It creates pages, updates them when new sources arrive, maintains cross-references, and keeps everything consistent. You read it; the LLM writes it.

**The schema** — a single configuration file at the root of the wiki (`WIKI_SCHEMA.md`) that describes how this specific project's wiki is structured: what page categories exist, what conventions to follow, what workflows to run. The schema is project-specific and lives with the wiki. It is created during initialization and updated whenever conventions need to change. The LLM reads the schema at the start of every session — it is the only persistent memory the LLM has about how this project's wiki works.

---

## Directory layout

```
/project-root/
├── raw/                    # Immutable source documents
│   ├── specs/              # PRDs, architecture docs, RFCs
│   ├── decisions/          # ADR source documents
│   ├── transcripts/        # Meeting notes, interviews
│   └── prs/                # PR descriptions, notable diffs
│
└── wiki/                   # LLM-generated and maintained
    ├── WIKI_SCHEMA.md      # Schema and conventions for this project
    ├── index.md            # Catalog of all wiki pages
    ├── log.md              # Chronological record of all operations
    ├── overview.md         # Product overview, always kept current
    ├── features/           # One page per user-facing feature
    ├── components/         # One page per architectural component or service
    ├── apis/               # Important endpoints and interfaces
    ├── data-models/        # Key entities and their schemas
    ├── decisions/          # One ADR page per architectural decision
    ├── glossary.md         # Product and domain terminology
    ├── onboarding.md       # Synthesized new-engineer guide
    └── assets/             # Images, diagrams referenced by wiki pages
```

The wiki can live as a subdirectory of the code repo (version-aligns automatically, wiki changes show up in PRs), as a separate companion repo (better for sensitive content or non-engineer access), or as a local-only directory (fine for solo or early-stage work). All three are just a folder of markdown files — any editor works.

---

## What lives in a dev wiki

Page categories to start with — add or remove based on your product:

- **Overview** — what the product is, who it's for, current state. Always kept current.
- **Features** — one per significant user-facing capability: what it does, why it exists, status, edge cases discovered in production.
- **Components / services** — one per major architectural piece: responsibility, dependencies, public interface, gotchas, ownership.
- **APIs** — important endpoints or interfaces, including contracts and versioning notes.
- **Data models** — key entities, their schemas, and how they relate.
- **Decisions (ADRs)** — one per architectural decision: context, options considered, decision, consequences. Written when the decision is made. Updated only with `Superseded-by:` links — never rewritten.
- **Glossary** — product- and domain-specific terms, kept consistent across the wiki.
- **Onboarding** — synthesized from everything else; optimized for a new engineer's first week.

Don't over-specify these up front. The schema starts small and the LLM proposes new categories as the product grows.

---

## Operations

### Ingest

You point the LLM at a new source and ask it to process. The LLM reads the source, surfaces key takeaways, writes or updates a summary entry, then propagates changes across the wiki — updating affected component and feature pages, creating a new ADR page if a decision was made, flagging contradictions where the new source disagrees with existing pages, updating the glossary if new terms appeared. It then appends an entry to the log. A single non-trivial source typically touches 5–15 wiki pages.

**How to trigger:**
```
Ingest raw/specs/prd-v2.md and update the wiki.
Ingest raw/prs/pr-1843-auth-refactor.md — this is a merged PR.
Ingest raw/transcripts/sprint-12-retro.md.
```

For ongoing development, two ingest patterns work well. **Per-PR**: after each merge, file the PR description and ask the LLM to ingest it. The LLM updates the affected component and feature pages. **Per-sprint**: at sprint end, batch-ingest the sprint's PRs, retro notes, and any new tickets. Less granular but lower overhead. Pick whichever fits how you work and document it in the schema.

### Query

You ask questions against the wiki. The LLM reads the index, finds relevant pages, and synthesizes an answer with citations. Good answers — comparisons, dependency maps, root-cause analyses — should be filed back into the wiki as new pages so they don't disappear into chat history.

**How to trigger:**
```
Query: What changed in the auth component this quarter?
Query: Why does the payments service retry 3 times instead of using a queue?
Query: What features depend on the user-prefs API?
Query: Summarize the current state of the onboarding flow.
```

### Lint

Periodically ask the LLM to health-check the wiki. It scans for: contradictions between pages, claims superseded by newer sources, orphan pages with no inbound links, important concepts without their own page, broken cross-references, missing ADRs for decisions evident in the code or log.

For a dev wiki, always include **code-drift checks** — diffing key wiki claims against the actual codebase. If the component page says the service exposes a REST endpoint but the code now uses gRPC, the lint pass catches it. This is the single biggest reliability lever for a developer wiki — without it the wiki rots into the same shape as a Confluence space nobody trusts.

**How to trigger:**
```
Lint the wiki.
Run a code-drift check on the components section.
Find any ADRs that are missing from the wiki.
```

### Reconciliation

When ingesting code changes, the LLM explicitly checks whether the change invalidates anything in the wiki and surfaces contradictions before resolving them. The schema should require: when a contradiction is found, describe it to the human and propose the update before writing.

---

## Indexing and logging

`index.md` is content-oriented. A catalog of every wiki page — link, one-line summary, optional metadata (last updated, source count, status). Organized by category. The LLM updates it on every ingest. When answering a query, the LLM reads the index first to find candidate pages, then drills in.

`log.md` is chronological. Append-only record of every operation — ingests, queries, lint passes, reconciliations. Each entry uses a consistent prefix so the log is greppable:

```
## [2026-04-02] ingest | PR #1843 — auth refactor
## [2026-04-05] query | What changed in auth this quarter?
## [2026-04-07] lint | Code-drift check, components section
```

`grep "^## \[" wiki/log.md | tail -10` gives you the last ten events.

---

## Optional tooling

At a few hundred pages, the index file plus the LLM's filesystem tools are enough. As the wiki grows:

A markdown search script — even a 30-line `ripgrep` wrapper the LLM can shell out to — is a meaningful upgrade over reading every page. For more, tools like `qmd` provide local hybrid BM25/vector search over markdown with a CLI and MCP server.

A pre-commit or CI hook that runs lint automatically on PR — the LLM checks the diff against the wiki and flags drift. This is what keeps the wiki honest in a team setting without requiring anyone to remember to prompt it.

A frontmatter convention (YAML at the top of each page: `last_updated`, `sources`, `status`, `owner`) enables simple scripts to surface stale pages, unowned pages, or pages with few sources. No plugin needed — `grep` and `yq` handle most of it.

---

## Tips

Keep raw sources well-organized in their own subdirectory. The wiki references them by relative path. Clear provenance makes the LLM more accurate about attributing and reconciling information.

Start the schema small. Define just enough to get the first few ingests working, then evolve it. The schema will be the most-edited file in the project for the first few weeks, then settle down.

Open the wiki in your editor alongside the LLM agent window. Watch the diffs as the LLM works. This is how you learn where the schema needs tightening.

For images and diagrams: ask the LLM to save them under `wiki/assets/` with descriptive filenames and reference them by relative path. Don't rely on external image URLs — they break.

When ingesting long sources (a 60-page PRD, an hour-long transcript), have the LLM produce a compressed summary in the source directory first, then drive wiki updates from the summary.

If you're a team, designate one person as schema owner. Multiple humans editing the schema concurrently produces an inconsistent wiki.

---

## Why this works

The tedious part of maintaining a product knowledge base isn't the writing — it's the bookkeeping. Cross-referencing, consistency, propagating one change across ten pages, reconciling new information with old. Humans abandon wikis because the maintenance cost grows faster than the perceived value. LLMs don't get bored, don't forget to update a cross-reference, and can touch a dozen files in one pass.

The human's job is to curate sources, direct exploration, ask the questions that matter, and decide what the product should be. The LLM's job is everything else — the careful, patient, thankless work of keeping the picture coherent as it grows.

---

## Initialization and activation

Paste the following block at the start of each project session. On first run it bootstraps the wiki; on returning sessions it resumes from current state.

---

```
You are the Dev Wiki agent for this project. Your operating instructions
are in wiki/WIKI_SCHEMA.md once it exists.

On startup, do the following:

CHECK STATE — look for wiki/WIKI_SCHEMA.md.

--- IF IT DOES NOT EXIST (first run) ---

1. Ask me three questions:
   - What is this project called and what does it do in one sentence?
   - What initial sources do I have ready to ingest (list filenames or types)?
   - Where should the wiki live — subdirectory of this repo, a separate repo,
     or local-only?

2. Based on my answers, draft WIKI_SCHEMA.md covering:
   - Page categories and templates for this product
   - Frontmatter conventions (last_updated, sources, status, owner)
   - Ingest workflow
   - Query workflow
   - Lint workflow including code-drift checks
   - Log entry format
   - Rule: when a contradiction is found, surface it to me before resolving

   Show me the draft. Do not write it yet.

3. Once I approve, create the directory structure, write WIKI_SCHEMA.md,
   create empty index.md and log.md, and create a stub wiki/overview.md.

4. Ingest the first source I named, end-to-end, so I can see the workflow
   and adjust the schema before the wiki grows.

5. Log the initialization in log.md.

--- IF IT EXISTS (returning session) ---

1. Read wiki/WIKI_SCHEMA.md silently.
2. Read wiki/index.md to orient to the current state of the wiki.
3. Read the last 5 entries in wiki/log.md for recent activity.
4. Confirm briefly: project name, page count, most recent log entry.
5. Wait for my instructions.

--- ACCEPTED COMMANDS (any session) ---

Ingest [source]       — process a source file and update the wiki
Query: [question]     — answer a question from wiki content
Lint the wiki         — health check and code-drift check
Update schema: [note] — revise WIKI_SCHEMA.md
Show index            — print current index.md
Show log [n]          — print last n log entries (default 10)

All operations follow the schema. When the schema is wrong or incomplete,
update it before proceeding.
```
