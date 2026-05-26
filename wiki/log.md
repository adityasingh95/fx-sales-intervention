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

## [2026-05-26] ingest | raw/prs/FXSW-013-phase-2-summary.md (synthesized from docs/dev-log.md + git log; build agent never produced the docs/phase-summaries file the KICKOFF-PROMPT contract called for). Affects no new wiki pages — Phase 2 ticket frontmatter was already inlined on relevant component/feature/scenario pages during the first-run ingest.

## [2026-05-26] lint | First-run lint pass. Findings:
##   - LINT-001 (fixed): 10 directory-style links (e.g. [...](../features/)) didn't resolve to a specific page. Repointed to specific files or to the corresponding section of wiki/index.md.
##   - LINT-002 (escalated): docs/BACKLOG.md status column severely stale — only 2 ☑ tickets, but commits + dev-log entries exist for FXSW-001 through FXSW-013 + FXSW-034. Surfaced to user; build agent owes a backlog refresh in next session (wiki write boundary blocks fix).
##   - LINT-003 (deferred): src/services/feed/referenceMids.json absent locally; expected per ADR-0005 (gitignored build artifact regenerated on predev/prebuild). No action.
##   - Code-drift on engine.ts pip deltas + clientProfiles.ts: deferred — files not yet implemented (Phase 4).
##   - Vendor-neutrality grep clean. State-machine drift clean. Dependency versions match package.json. All 5 scenarios match definitions.ts. data-* test contract clean (forward-looking wiki-only attrs are roadmap claims on in-progress pages).

## [2026-05-26] reconcile | wiki/CLAUDE.md merge conflict on main — build agent had written a softer "scope" version at 85c476b; our stricter 10-rule version (per user directive) takes precedence. Resolution merged useful build-agent sections (root-CLAUDE.md scoping note, Activation pointer, build-agent coordination) into the strict-rule structure. User approved option 2 (merge).

## [2026-05-26] resolved | LINT-002 — build agent flipped FXSW-001 through FXSW-022 to ☑ in docs/BACKLOG.md (commit 58895d4 on main). Escalation closed.

## [2026-05-26] ingest | docs/phase-summaries/FXSW-021-summary.md + Phase 3 commits (FXSW-014 through FXSW-021). Affected pages:
##   - wiki/features/ticket.md: major update — promoted to stable, documented all 7 sub-panels with real testids + per-ticket commit attributions
##   - wiki/scenarios/off-hours-intervention.md: in-progress → stable; cited commit 65e2cbf; noted toast + title-prefix assertions intentionally deferred to FXSW-028
##   - wiki/components/pricing-feed.md: added usePrice hook section (FXSW-017)
##   - wiki/features/active-blotter.md: noted opacity-75 dim-when-ticket-open
##   - wiki/data-models/deal.md: noted marginPips/pricingMode/fixedSide/frozenTick are TicketPanel-owned interim state until FXSW-025 lifts to dealMachine
##   - wiki/index.md: status refresh
##   Phase 4 work (FXSW-022 through FXSW-027) landed on main but is OUT OF SCOPE for this ingest per user direction; deferred to a separate Phase 4 ingest.

## [2026-05-26] lint | Post-Phase-3 lint pass (focus: data-testid + component naming per user request). Findings:
##   - LINT-301 (fixed): inject-RESET in src vs reset-session in wiki — name drift in wiki/features/dev-injector.md. Repointed to inject-RESET. Also added missing dev-injector + dev-injector-slot testids.
##   - LINT-302 (fixed): active-blotter-body + historic-blotter-body testids on src body wrappers, absent from wiki — added to wiki/features/{active,historic}-blotter.md test-contract blocks.
##   - LINT-303 (deferred): suggestion-factors, suggestion-recompute, suggestion-undo testids exist in Phase 4 src but absent from wiki/features/ai-margin-suggestion.md. Out of scope for Phase 3 ingest; will close with the Phase 4 ingest.
##   - Component naming drift: clean (every wiki-named component matches a src/ basename).
##   - Vendor-neutrality, state-machine, scenario, dep-version, cross-reference, orphan-page checks: all clean.

## [2026-05-26] ingest | docs/phase-summaries/FXSW-027-summary.md + Phase 4 commits (FXSW-022 through FXSW-027). Affected pages:
##   - wiki/components/suggestion-engine.md: in-progress → stable; fixed credit-decline shape discriminator (state→kind) and field name (message→rationale); added rationale-builder detail per rationale.ts; added per-ticket commit table
##   - wiki/features/ai-margin-suggestion.md: in-progress → stable; full rewrite with real testid set (added suggestion-factors / suggestion-recompute / suggestion-undo per LINT-303); per-ticket commits; pips-span scoping note from FXSW-027 debug detour
##   - wiki/data-models/client-profile.md: in-progress → stable; Halcyon acceptance rate "—" → 0.5 with neutral-prior rationale per clientProfiles.ts comment; averageMarginPaid added to seed table; unknown-client fallback documented
##   - wiki/data-models/margin-suggestion.md: in-progress → stable; discriminator state → kind; ReadySuggestion + CreditDeclineSuggestion split per types.ts; panel-local applied/computing states distinguished from engine outputs
##   - wiki/scenarios/credit-breach.md: in-progress → stable; cited commit ab8cd30; two-reason-label assertion note; deferred toast/title to FXSW-028
##   - wiki/scenarios/size-limit-margin-tune.md: in-progress → stable; cited commit ab8cd30; concrete assertion details
##   - wiki/index.md: status refresh — 4 AI pages promoted to stable; 2 scenarios promoted to passing-E2E
##   - LINT-303 resolved (suggestion-* testids now documented).
