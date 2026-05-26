---
last_updated: 2026-05-26
sources:
  - docs/06-tech-architecture.md
  - docs/01-prd.md
status: stable
---

# ADR-0001 — Vite + React + Tailwind over Next.js

**Date:** 2026-05-20 (pre-build)
**Status:** Stable

## Context

The prototype is a single-page workstation with no backend, no auth, no SEO needs, no server-rendered routes, and no per-route data fetching. It is statically hostable. The standard mid-2020s default for a new React app is Next.js — App Router, server components, integrated bundler. Next.js's full feature set is overkill for this shape and adds a meaningful learning + configuration surface.

## Options considered

1. **Next.js (App Router).** The default modern choice for production React. Built-in routing, RSC, image optimisation, file-system conventions.
2. **Vite + React + Tailwind.** Pure SPA. Fast HMR. Zero config beyond the bundler. Tailwind for styling.
3. **Create React App.** Officially deprecated; no.
4. **Remix.** Similar full-framework profile to Next; same overhead concern.

## Decision

Option 2: Vite 5 + React 18 + Tailwind CSS 3.

## Consequences

**Positive:**
- Build configuration is small enough to fit in two files (`vite.config.ts` + `tailwind.config.ts`).
- HMR is sub-second for component edits; the build is sub-second for a clean rebuild.
- The shipped artifact is a static folder — deployable to GitHub Pages, Vercel, Netlify, Cloudflare Pages, or any CDN.
- No server runtime to reason about; no "is this code running on the client or the server" footgun.
- Tailwind + design tokens (see [decisions/ADR-0008-ai-indigo-accent.md](ADR-0008-ai-indigo-accent.md)) gives velocity without a UI kit.

**Negative:**
- No file-system routing — but the app has one route, so this is a non-issue.
- No built-in image optimisation — but there are no large images in the UI; icons are inline SVG via `lucide-react`.
- No code-splitting by default beyond what Vite's `Rollup` does — but the bundle is small enough that it doesn't matter (AG-Grid is the bulk).
- If the prototype ever grows into a multi-route app with a backend, the framework choice would need revisiting — explicitly out of scope.

## Pinned versions

- `vite@5.2.10`
- `react@18.3.1` / `react-dom@18.3.1`
- `typescript@5.4.5` (strict, no `any`)
- `tailwindcss@3.4.3`

See `docs/06-tech-architecture.md` §1 for the full pinned dependency manifest.

## Sources

- `docs/06-tech-architecture.md` §1 — stack table, pinned versions
- `docs/01-prd.md` §8, §10 — desktop-only, frontend-only, browser-support constraints
- `docs/dev-log.md` FXSW-001 — implementation notes
