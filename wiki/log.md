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

## [2026-05-26] ingest | docs/05-ui-ux-spec.md → ADR-0008 (indigo accent reserved for AI surfaces); visual-treatment sections inlined in features/* and ai-margin-suggestion

## [2026-05-26] ingest | docs/06-tech-architecture.md → ADR-0001 (Vite/React/Tailwind), ADR-0003 (XState + Zustand), ADR-0004 (AG-Grid superseded by flex-row table)

## [2026-05-26] ingest | docs/07-scenario-pack.md → created wiki/scenarios/{happy-path-esp,off-hours-intervention,credit-breach,size-limit-margin-tune,release-path}.md

## [2026-05-26] ingest | docs/08-test-plan.md → onboarding §8 (testing layers + determinism); test-contract sections inlined in feature/component pages

## [2026-05-26] ingest | docs/09-suggestion-engine.md → wiki/components/suggestion-engine.md + wiki/features/ai-margin-suggestion.md + wiki/data-models/{client-profile,margin-suggestion}.md + ADR-0006 + ADR-0007

## [2026-05-26] ingest | docs/BACKLOG.md → onboarding §9 (build progression table) + ticket frontmatter on per-page

## [2026-05-26] ingest | docs/README.md + /CLAUDE.md + docs/KICKOFF-PROMPT.md → ADR-0010 (brand-neutral product / vendor names forbidden)

## [2026-05-26] ingest | docs/dev-wiki.md → reference only (this agent's own methodology)

## [2026-05-26] schema-update | wrote onboarding.md (status: in-progress; final rewrite at end of Phase 5)

## [2026-05-26] lint | first-run sweep — vendor-neutrality grep clean (zero hits in content pages; rule-definition files retain term by necessity)
