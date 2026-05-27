# Wiki Setup

This repo contains a downstream `wiki/` knowledge layer that is maintained separately from the build-agent documentation.

## Purpose

The wiki captures stable project knowledge after implementation work has landed:

- product concepts,
- architecture decisions,
- feature behaviour,
- state-machine contracts,
- test patterns,
- known reconciliation items.

The wiki is not a replacement for the source docs. It is a synthesized navigation layer over the spec pack, source code, test suite, dev log, and phase summaries.

## Agent boundary

The build agent owns:

- `src/`
- `tests/`
- root config files
- `docs/`

The Wiki Agent owns:

- `wiki/`
- `raw/`

Do not mix these write boundaries unless explicitly approved.

## Initial Wiki Agent prompt

Read:

1. `wiki/CLAUDE.md`
2. `wiki/WIKI_SCHEMA.md`
3. `docs/dev-wiki.md`
4. the latest `docs/phase-summaries/*.md`

Then run the requested ingest/query/lint task.

## Vendor neutrality

No vendor names may appear in `wiki/` or `raw/`. If a fact originated from a vendor-specific source, cite the relevant in-repo sanitized documentation instead of external vendor URLs.

## Recommended workflow

1. Build agent completes a ticket or phase.
2. Build agent writes or updates `docs/dev-log.md` and, where relevant, `docs/phase-summaries/`.
3. Wiki Agent ingests those artifacts.
4. Wiki Agent updates feature/component/ADR pages.
5. Wiki Agent runs lint checks.
6. Any contradictions are surfaced before overwrite.
