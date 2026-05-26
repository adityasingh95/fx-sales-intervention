---
last_updated: 2026-05-26
sources:
  - docs/README.md
status: stable
---

# ADR-0010 — Product is brand-neutral; vendor names forbidden in shipped artifacts

**Date:** 2026-05-20 (pre-build)
**Status:** Stable

## Context

The prototype's workflow is grounded in publicly documented FX Sales Intervention specifications. The spec pack under `/docs/` references those URLs for research grounding. The deployed prototype, however, is not a re-implementation of any vendor product — it's a brand-neutral demonstration of the SI workflow with simulated data.

Without an explicit rule, vendor names could leak into the shipped build through UI strings, package metadata, README, comments, source-map identifiers, or wiki content visible to external readers.

## Decision

Two layers of rule:

**Build-agent layer (`/CLAUDE.md` rule §1):** No vendor names in any shipped artifact — UI text, package metadata, comments, the deployed README, code identifiers, source-map identifiers. The spec pack under `/docs/` references vendor URLs for research grounding only and is not shipped in `dist/`. Industry-standard FX terminology that happens to also be used by the upstream vendor (`Quoted`, `PickedUp`, `Executable`, `RFS`, `Sales Intervention`, `Active Deals Blotter`, etc.) is fine — those terms are not vendor-proprietary.

**Wiki layer (`/wiki/CLAUDE.md` rule §1):** Stricter — no vendor names anywhere in `wiki/` or `raw/`, including in citation/research-grounding URLs. If a fact originated in a vendor doc, paraphrase it from the relevant in-repo `/docs/` file and cite that file instead. The single source of vendor URLs in the repo is the build-agent layer (`/CLAUDE.md` and `/docs/`).

## Consequences

**Positive:**
- The deployed prototype reads as a brand-neutral product demo. Nothing in the UI, README, or wiki gives the impression of a sanctioned re-implementation.
- External readers of the wiki get a clean product knowledge base they can read end-to-end without bouncing to vendor docs.
- Industry-standard FX terms remain usable — the rule is targeted at vendor identity, not at the technical vocabulary the field shares.

**Negative:**
- Research-grounding URLs are one layer harder to find. They live in `/docs/00-glossary.md` (build-agent territory) but not in the wiki. A reader who wants to compare the prototype's state names to the canonical source has to look in `/docs/`, not `/wiki/glossary.md`. Acceptable — `/docs/` is the build-agent's source-of-truth layer; `/wiki/` is the product-knowledge synthesis.
- The wiki agent enforces the stricter rule per-write (a forbidden-term grep over the file before each write, per `wiki/CLAUDE.md` rule §10) and per-lint (the same grep over `wiki/` and `raw/` returning zero hits outside the rule-definition files). Discipline cost.

## Enforcement

- **Build agent:** `pnpm build` produces `dist/`; a forbidden-term grep over `dist/` returns no matches. Verified as a per-ticket gate in `docs/dev-log.md` entries.
- **Wiki agent:** per-write grep before each `Write`; per-lint grep over `wiki/` and `raw/` returning zero non-meta hits.

## Sources

- `docs/README.md` — "A note on branding"
- `/CLAUDE.md` rule §1 (build-agent layer)
- `/wiki/CLAUDE.md` rule §1 (wiki layer)
