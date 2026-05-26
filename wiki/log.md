# Wiki Log

Chronological, append-only record of every wiki operation. Format:

```
## [YYYY-MM-DD] {op} | {target}
```

Operations: `ingest`, `query`, `lint`, `adr`, `schema-update`, `reconcile`.

`grep "^## \[" wiki/log.md | tail -20` gives recent activity.

---

## [2026-05-26] schema-update | First-run bootstrap — created WIKI_SCHEMA.md, directory tree, empty index + log, stub overview

## [2026-05-26] schema-update | Hardened vendor-neutrality rule — no Caplin anywhere in wiki/ or raw/, including citation URLs; added wiki/CLAUDE.md as wiki-agent operating rules (rules §1, §10 enforce)

## [2026-05-26] ingest | docs/00-glossary.md → wiki/glossary.md (first real ingest; vendor-neutralized; index updated)
