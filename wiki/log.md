# Wiki Log

Chronological, append-only record of every wiki operation. Format:

```
## [YYYY-MM-DD] {op} | {target}
```

Operations: `ingest`, `query`, `lint`, `adr`, `schema-update`, `reconcile`.

`grep "^## \[" wiki/log.md | tail -20` gives recent activity.

---

## [2026-05-26] schema-update | First-run bootstrap — created WIKI_SCHEMA.md, directory tree, empty index + log, stub overview

## [2026-05-26] schema-update | Hardened vendor-neutrality rule — no vendor names anywhere in wiki/ or raw/, including citation URLs; added wiki/CLAUDE.md as wiki-agent operating rules (rules §1, §10 enforce)

## [2026-05-26] ingest | docs/00-glossary.md → wiki/glossary.md (first real ingest; vendor-neutralized; index updated)

## [2026-05-26] ingest | docs/01-prd.md → refreshed wiki/overview.md (in-progress → stable)

## [2026-05-26] ingest | docs/02-functional-spec.md → created wiki/features/{active-blotter,historic-blotter,ticket,notifications,dev-injector}.md

## [2026-05-26] ingest | docs/03-trade-state-model.md → created wiki/components/{rfs-machine,si-machine,deal-machine,status-derivation}.md + ADR-0002 + ADR-0009

## [2026-05-26] ingest | docs/04-dummy-feed-spec.md → created wiki/components/{pricing-feed,deal-feed,scenario-player,deals-store}.md + wiki/data-models/{price-tick,deal-event,deal}.md + ADR-0005
