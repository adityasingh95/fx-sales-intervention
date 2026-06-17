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

## [2026-05-26] lint | Post-Phase-4 lint pass (MANDATORY focus: engine.ts pip-deltas ↔ wiki/components/suggestion-engine.md). Findings:
##   - Pip-delta drift check: CLEAN. 13/13 values match — 4 tier baselines (1.5/2/3/4), 3 notional bands (+2.5/+1.5/+0.5), 3 market deltas (+1/+1.5/+0.5), 2 rejection-reason deltas (+1.5/+0.5), 3 behaviour deltas (−1/−0.5/−0.5), confidence thresholds (10M/100M/1M/<0.4), floor `max(1, round(...))`.
##   - LINT-401 (fixed): client-bid, client-ask, estimated-profit testids documented in prose in wiki/features/ticket.md but not enumerated in test-contract format. Replaced "each with its own testid" with the explicit data-testid="..." strings.
##   - Client profile seed values: all 5 match exactly (Halcyon's 0.5 neutral prior preserved bold).
##   - Vendor-neutrality, component naming, state-machine, scenario, dep, cross-reference, orphan checks: all clean.
##   - BACKLOG status: 28 ☑ tickets match 28 unique FXSW commits in git log.

## [2026-05-26] schema-update | Added test-case documentation per user request (option 2 of 3 surfaced):
##   - New: wiki/components/test-patterns.md — 11 recurring patterns (seed pinning, fake timers, hold-to-confirm, harness, queueMicrotask, cell-testid scoping, throwaway debug spec, etc.). Stable reference doc; pattern set changes rarely.
##   - Added ## Tests sections to 9 component pages (pricing-feed, deal-feed, scenario-player, deals-store, rfs-machine, si-machine, deal-machine, status-derivation, suggestion-engine) and 6 feature pages (active-blotter, historic-blotter, ticket, ai-margin-suggestion, notifications, dev-injector). Each section: file path + case count + 1-line category summary. Cross-references to test-patterns.md §N where a pattern is at play.
##   - onboarding.md §8 updated to point at test-patterns.md as required reading before first test.
##   - wiki/index.md: test-patterns.md added to Components category.
## [2026-05-26] ingest | docs/phase-summaries/FXSW-033-summary.md + Phase 5 commits (FXSW-028 → FXSW-033). Final-sweep ingest. Affected pages:
##   - wiki/features/notifications.md: in-progress → stable. Major rewrite covering toast/title-flash/row-flash/WebAudio-chime/mute, dispatcher dedupe via notifiedDealIds Set, audio unlock + lazy AudioContext + factory injection, per-deal one-shot chime via Set-size growth. Tests inventory across 5 test files (20 cases). Known interim + Phase-5-resolved items called out.
##   - wiki/scenarios/release-path.md: in-progress → stable. Cited commit ad4cade. Documented Release-closes-ticket (one-line addition to TicketFooter handler) vs Esc/backdrop-don't (passive paths). Runtime 0.7s (fastest E2E).
##   - wiki/features/ticket.md: HoldButton inline note replaced with shared src/components/Button.tsx primitive reference (FXSW-030 lift); cross-reference to AI suggestion panel.
##   - wiki/features/ai-margin-suggestion.md: "Known interim" duplicate RejectHoldButton item moved to "Resolved during Phase 5" (FXSW-030 lift).
##   - wiki/overview.md §Current state: Phase 4 closed → Phase 5 closed, full feature list, 316 unit + 6 E2E counts, CI/deploy status, two user-side follow-ups (CI green flip + demo recording).
##   - wiki/index.md: status refresh — notifications stable, release-path passing E2E, onboarding stable.
##   - wiki/onboarding.md: REWRITTEN FROM SCRATCH per user direction + schema mandate (FXSW-033 trigger). 15 sections: what this is, demo, architecture, stack, repo, commands, three-agent setup, where-to-start map, testing + patterns, five scenarios, cross-cutting rules, DoD, full build progression, 11 lessons-that-survived, glossary pointer. Status: stable.

## [2026-05-26] lint | FINAL-SWEEP lint pass — all 11 categories, all code-drift checks per WIKI_SCHEMA.md §Lint. Results:
##   - 1. Vendor neutrality: ✓ clean (zero hits in content pages).
##   - 2. State machines: ✓ clean (siMachine 11 states + Removed; rfsMachine 6 states + Removed; matches wiki).
##   - 3. Dependency versions: ✓ clean (react/typescript/vite/tailwindcss/xstate/zustand all match package.json).
##   - 4. Scenario data: ✓ clean (all 5 scenarios match definitions.ts on client/account/pair/side/notional/reasons).
##   - 5. Client profiles: ✓ clean (clientProfiles.ts unchanged in Phase 5; last verified clean in Phase 4 lint).
##   - 6. PIP-DELTA DRIFT (mandatory, engine.ts ↔ suggestion-engine.md): ✓ CLEAN — 13/13 values match. engine.ts unchanged in Phase 5.
##   - 7. data-testid: ✓ clean. All apparent "drift" findings are false positives — pipe-separated wiki notation (margin-input/plus/mid-cell etc.), runtime testId prop on Button + cells (bid-cell/ask-cell/suggestion-reject), template-literal scenario buttons (inject-{ScenarioId}), dynamic toast-{dealId}, doc placeholder strings.
##   - 8. Component naming: ✓ mostly clean. IconButton.tsx / NumberInput.tsx / Tooltip.tsx are 1-line `export {}` stubs from FXSW-003 — inventoried in docs/05 §3.1 but never built. Wiki documents what's used.
##   - 9. Broken links: ✓ clean (zero unresolved file targets).
##   - 10. Orphan pages: ✓ clean (every page has at least one inbound link).
##   - LINT-501 (escalated): docs/BACKLOG.md shows FXSW-034 as ☐ but the GitHub Pages deploy workflow shipped at commit 0762c4e in Phase 1 (pulled forward) — see docs/dev-log.md FXSW-034 entry. Wiki agent can't flip the box (write boundary), escalating to build agent for next session.

## [2026-05-26] schema-update | Refresh stale-state synthesis pages post-merge. Spotted by user. Fixed:
##   - overview.md §Current state: "Phase 2 closed" → "Phase 4 closed" with current test suite counts (296 unit + 4 E2E + smoke) and remaining-Phase-5 list.
##   - onboarding.md §9 build-progression: Phases 3 + 4 flipped Not-started → Done; Phase 2 demoted from "(current state)" to plain Done.
##   - features/ticket.md: dropped the stale "AI panel wiki still in-progress pending Phase 4 ingest" line — AI panel is now stable; replaced with a clean stable-state description.
##   - glossary.md: dropped three "(pending)" notes on dummy-feed / scenarios / dev-injector cross-references — those pages all exist now; repointed to live wiki links.
##   in-progress statuses confirmed correct on: onboarding.md (schema-mandated rewrite-at-end-of-Phase-5), notifications.md (Phase 5), release-path.md (FXSW-031 Phase 5).

## [2026-06-10] ingest | Phase 6.1 UX feedback pass (commits fc149cd, 0fc2d0d, 77c2f96, f413e4f) — source docs/phase-summaries/FXSW-042-followup-summary.md + dev-log Phase 6.1 entry.
##   - NEW components/dev-injector.md — dev-version scenario gating + v2 mobile Dev▾ popover (fixed positioning, getBoundingClientRect, overflow-clip escape).
##   - NEW components/resize-handle.md — v2 blotter split: containerRef live-read event contract + App.tsx grow-weighted-flex layout contract (percentage flex-basis quirk under stretched parent).
##   - features/ticket.md — Refresh always-rendered/disabled-outside-fixed (supersedes FXSW-018 "only in fixed mode"); v2 dual-margin under-cell layout (MarginRow under each price cell, Balance+Zero centered below, native spinner suppressed); mobile footer compaction + "Stream" label.
##   - features/ai-margin-suggestion.md — note Pricing Panel Refresh always-visible/disabled-in-streaming.
##   - features/dev-injector.md — ?dev=v2 scenarios, Hold/Release rename, mobile popover; cross-ref to component page.
##   - components/scenario-player.md — CLIENT_ACCEPT_OR_REJECT FollowUpEvent (Math.random()<0.5 in buildFollowUpEvent); CREDIT_BREACH + RELEASE_PATH follow-up rows; v2 scenario set note.
##   - scenarios/credit-breach.md — randomized trader-quote terminal path (CLIENT_ACCEPT_OR_REJECT); scenarios/release-path.md — Hold/Release label + quote-path CLIENT_ACCEPT follow-up.
##   - index.md — registered both new component pages; updated dev-injector feature entry.
##   - Brand-neutrality: case-insensitive vendor-name grep over wiki/ + raw/ → 0 hits (verified post-write).

## [2026-06-11] ingest | Phase 7 Light Theme (FXSW-043 → FXSW-046, main commit a622dce) — source docs/phase-summaries/FXSW-046-summary.md.
##   - NEW features/theme-switching.md — opt-in light theme behind ?theme=preview; ThemeToggle (Sun/Moon, null when flag off); pure-parser/window-guarded URL-gate pattern (mirrors devVersion.ts); orthogonal to ?dev=v2.
##   - NEW components/theme-store.md — Zustand theme store; resolveInitialMode (force-dark off / stored / prefers-color-scheme); sole writer of document.documentElement.dataset.theme; sessionStorage si.theme.
##   - NEW decisions/ADR-0011-tailwind-rgb-variable-tokens.md — RGB-triple CSS-var migration: rgb(var(--color-X) / <alpha-value>) so utilities flip via cascade + keep opacity modifiers; captures the literal-hex bug (token file-content tests green while render pipeline broken; needs a visual gate).
##   - overview.md §Current state → "Phase 7 closed (light theme behind ?theme=preview)"; corrected the stale "There is no Phase 6" line with a phase-progression note; test count 316 → 422.
##   - index.md — registered the 3 new pages; glossary.md — added Preview flag + Light theme terms.
##   - Boundary: writes confined to wiki/. Vendor-neutrality: case-insensitive vendor-name grep over wiki/ + raw/ → 0 hits (verified post-write).
##   - NOTE: this Phase 7 ingest was reviewed + approved as PR #18 and squash-merged to main on 2026-06-16, after the v2 (Phase 6/6.1) and v3 (Phase 8) ingests had already landed; the entries below/above preserve the change history in order.

## [2026-06-16] ingest | Phase 8 v3 + feedback rounds (FXSW-048–071; commits 1631e0a, f800115, eca0754) — sources docs/phase-summaries/phase-08-v3-summary.md + docs/dev-log.md FXSW-062–071 + spec §§ (02 §10/§11, 03 §9, 05 §16/§17/§17.1).
##   - NEW components/external-price-feed.md — opt-in runtime market-data adapter (generic provider, NO vendor/host named); GUI key in sessionStorage (si.externalFeedKey), 5-min poll re-anchors pricing-feed (setReferences/clearReferences), status pill Off/Connecting/Live/Error/Rate-limited, OFF by default; sim remains the only test path.
##   - NEW features/forward-pricing.md — tenors 1W–1Y, fwd points per (pair,tenor) seeded RNG, outright = spot+points, all-in vs per-component markup, all-in reflects full markup (FXSW-064), fwd Balance/Zero floor 0, fwd-points `pips` suffix (FXSW-071), LegTabs swap-ready, tenor selector (FXSW-059), value dates.
##   - NEW features/historical-detail.md — clickable Historic rows → read-only overlay (FXSW-060): deal terms, markup reason / auto-priced note, lifecycle timeline.
##   - NEW data-models/deal-lifecycle-phase.md — REQUEST/PICKUP/RELEASE/PRICE_BACK/AUTO_PRICE/WITHDRAWN/RESPONSE; phase source RFS(ESP)/SI(else); AUTO_PRICE vs PRICE_BACK (FXSW-070); WITHDRAWN (FXSW-065). Drift-checked vs src/types/lifecycle.ts + lifecyclePhase.ts.
##   - features/ticket.md — v3 ESP read-only view (data-readonly, auto-priced-note, no pricing/footer; FXSW-069) + one-sided markup lock (restrictMarginSides + quoteSide; FXSW-068); noted FXSW-047 v2→GA gate-strip staleness.
##   - features/active-blotter.md + historic-blotter.md — v3-only Request ID / Trade ID / Value date columns (isV3 spreads; FXSW-066); Historic rows clickable → detail overlay.
##   - components/si-machine.md — WithdrawSent observed as WITHDRAWN timeline phase (no new canonical state; FXSW-065).
##   - index.md + glossary.md — registered 4 new pages; added v3 terms.
##   - Vendor-neutrality: case-insensitive vendor-name grep over wiki/ + raw/ → 0 hits (verified post-write); external provider described generically per ADR-0010 / CLAUDE.md §1 (the src/services/feed/external/ build-layer exception deliberately NOT applied to the wiki).
##   - Also sanitized a pre-existing vendor-name leak in decisions/ADR-0005 (three commercial FX-data providers).

## [2026-06-17] ingest | Phases 9–11 (v4 instruments + security remediation, FXSW-072–091; commit a8b475c) — sources phase-09-v4 / phase-10-ndf / phase-11-swaps summaries + dev-log + security/FXSW-081 + FXSW-087 reviews + source.
##   - NEW features/ndf.md — cash-settled points-only NDF; structural inertness via spotMarginFor (FXSW-089); ndf-note; forward-tenor coercion.
##   - NEW features/swaps.md — forward-forward two-leg swap; net = far − near; Per-component/Total markup; one-sided lock in math (gateMarginToSide); dual value dates; SwapLegDetail; "legs adjusted" note.
##   - NEW components/swap-points-feed.md — swapPointsFeed.get(pair,near,far), pure composition of forward-points feed (no new RNG).
##   - NEW ADR-0012 (?dev=v4 superset + instrumentType discriminator), ADR-0013 (NDF points-only structural), ADR-0014 (swap net-points + Per-component/Total), ADR-0015 (security remediation: build-only CSP+SRI, Bearer key, opt-in+validated build fetch, dev-only poller, toolchain audit 0), ADR-0016 (GA-core determinism: seeded coin-flip / forgetDeal / injectable IDs / ?seed=N).
##   - features/forward-pricing.md — two-sided points (ForwardPointsPair {bid,ask,mid}, fwd-points-bid/mid/ask), v3 goldens re-baselined (FXSW-073), leg model now real two-leg swap (not "swap-ready").
##   - data-models/deal.md — replaced "out of scope for v1"; documented instrumentType / legs (NEAR/FAR) / swapRequested.
##   - features/dev-injector.md + components/dev-injector.md — v4 instrument (inject-instrument) + far-tenor (inject-far-tenor) selectors; refreshed ?dev=1/?dev=v2 → ?dev=v3/?dev=v4 (scenario set no longer version-gated; selectors are).
##   - features/active-blotter.md + historic-blotter.md — v4 Instrument column + dual value dates (near → far).
##   - features/historical-detail.md — swap leg-detail (SwapLegDetail) + swap/NDF markup-reason summary.
##   - features/ticket.md — NDF points-only branch + swap two-leg branch.
##   - components/deal-machine.md — canQuote side-lock, terminal protection (notTerminal/markTerminal), ClientReject routed to both legs (FXSW-088).
##   - components/scenario-player.md — buildDeal instrument/tenor coercion, forgetDeal, seeded coin-flip + injectable acceptOrReject (supersedes the stale "Math.random direct / no injectable seam" note).
##   - components/pricing-feed.md — ?seed=N replay knob (below window.__seedFeed). components/rfs-machine.md — *Sent asymmetry (RFS Executable ≠ client-sent).
##   - components/external-price-feed.md — Authorization: Bearer key; dev-only poller; build CSP connect-src 'self'.
##   - glossary.md — net swap points, forward-forward, instrument discriminator, ?dev=v4, NDF, CSP, SRI. index.md — registered new pages + ADRs; refreshed stale v2 dev-refs.
##   - Brand-neutrality: sanitized pre-existing vendor-name + endpoint-URL leaks (a public reference-rate aggregator, a central-bank feed host, another rate-API host) from ADR-0005, onboarding.md, WIKI_SCHEMA.md. Final case-insensitive vendor-name grep over wiki/ + raw/ → 0 hits. The external market-data provider is described generically throughout.
