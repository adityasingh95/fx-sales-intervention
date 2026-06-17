---
last_updated: 2026-06-17
sources:
  - docs/phase-summaries/phase-09-v4-summary.md
  - docs/phase-summaries/phase-11-swaps-summary.md
  - docs/dev-log.md
status: stable
ticket: FXSW-088, FXSW-089, FXSW-091
---

# ADR-0015 — Security remediation: build hardening, key transport, and external-call surface

**Date:** 2026-06-17 (Phases 9–11)
**Status:** Stable

## Context

From Phase 9 an independent **Security Agent** reviews the build cold at the end of every phase, filing findings under `/security/`. The first reviews (FXSW-077, then FXSW-081 — 9 findings, 2 High) concentrated risk in the **external-call surface and build pipeline**: the external market-data API key was sent as a URL query parameter, the build-time reference-rate fetch ran unconditionally and unvalidated, there was no Content-Security-Policy or Subresource-Integrity on the shipped bundle, and the toolchain carried 24 dependency advisories. These are prototype-grade risks but worth closing before the instrument work widened the surface.

## Decision

A remediation pass (FXSW-088/089, completed at FXSW-091) hardened the build and the external-call surface. Decisions:

- **Build-only CSP + SRI.** A restrictive Content-Security-Policy is injected at **build** (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `script-src 'self'`, **`connect-src 'self'`**, …), and SHA-384 Subresource-Integrity is added to emitted `<script>`/`<link>` tags. Both are applied to `vite build` / `preview` only — the dev server needs inline/eval/websocket for HMR and would conflict with a strict policy.
- **API key via `Authorization: Bearer` header**, not a URL query parameter — so the secret never appears in provider/proxy access logs, the browser network URL column, or a `Referer`.
- **Live runtime poller confined to dev.** The simulated feed is the production default; `connect-src 'self'` blocks any cross-origin poll in the build, so the opt-in live feed is a development-only affordance (see [components/external-price-feed.md](../components/external-price-feed.md)).
- **Opt-in, range-validated build-time reference-mid fetch.** The prebuild script fetches reference mids only when explicitly enabled by an environment flag; otherwise it uses committed fallback mids. Fetched values are bounds-checked per pair (and `Number.isFinite`) so a poisoned-but-HTTP-200 response is rejected.
- **Toolchain bump.** The build tool was moved to its current major line and a transitive bundler override applied; `pnpm audit` went **24 → 0** advisories.

The external market-data provider and its endpoint are referenced only in **adapter code** under a documented build-layer exception; **no vendor name or endpoint host appears in user-visible strings or in this wiki** (described generically as "an external market-data provider" / "a public reference-rate API"). See [ADR-0010](ADR-0010-brand-neutral-product.md).

### Options considered

- **Apply CSP/SRI in dev too.** Rejected — breaks HMR; the threat model is the shipped artefact.
- **Widen `connect-src` to allow the live provider in production.** Rejected — would re-open the connect surface; the build ships simulation-only, and the live poller stays a dev affordance. (A residual inconsistency — the key-entry UI still exists while the build CSP forbids the call — is tracked as FXSW-087 T-2.)
- **Keep the API key in the query string.** Rejected — leaks the secret into logs/URLs.

## Consequences

- **Positive:** shipped bundle is locked to same-origin script + connect; the secret is header-only; the build fetch is opt-in and validated; the dependency tree is clean (audit 0). Functional price-integrity posture is independently rated good (one-sided lock enforced in math, margins floored, captured margins reconcile).
- **Negative:** the live external feed cannot run from the production build (by design); the dev/prod CSP split means a class of issues only manifests in `preview`/`build`, so E2E must run against a fresh `dist/`. A few lower-severity items remain tracked (FXSW-091 / FXSW-087 T-2, T-3).

## Sources

- `docs/phase-summaries/phase-09-v4-summary.md`, `phase-11-swaps-summary.md` — Security Agent cadence + remediation landing
- `docs/dev-log.md` FXSW-088, FXSW-089, FXSW-091
- `security/FXSW-081-review.md`, `security/FXSW-087-review.md` — the findings (no vendor names in the reports)
- Related: [components/external-price-feed.md](../components/external-price-feed.md), [ADR-0005](ADR-0005-bake-reference-mids.md)
