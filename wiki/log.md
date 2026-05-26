# Wiki Log

Chronological, append-only record of every wiki operation. Format:

```
## [YYYY-MM-DD] {op} | {target}
```

Operations: `ingest`, `query`, `lint`, `adr`, `schema-update`, `reconcile`.

`grep "^## \[" wiki/log.md | tail -20` gives recent activity.

---

## [2026-05-26] schema-update | First-run bootstrap — created WIKI_SCHEMA.md, directory tree, empty index + log, stub overview
