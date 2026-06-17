---
last_updated: 2026-06-11
sources:
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/FXSW-046-summary.md
status: stable
ticket: FXSW-046
---

# ADR-0011 — Tailwind colour utilities reference RGB-triple CSS variables

**Date:** 2026-06-10 (Phase 7, FXSW-046)
**Status:** Stable

## Context

Phase 7 added an opt-in [light theme](../features/theme-switching.md). The runtime mechanism is deliberately minimal: the [theme store](../components/theme-store.md) flips a single `document.documentElement.dataset.theme` attribute, and `src/styles/tokens.css` overrides every colour token under a `[data-theme='light']` block. For that to recolour the app, **Tailwind utility classes** (`bg-bg-app`, `text-text`, `border-border`, …) — which style almost every element — have to resolve their colour *through* the token at render time, so a `data-theme` change cascades to them.

The original `tailwind.config.ts` mapped each colour to a literal value. Tailwind compiled those utilities to **literal hex** in the stylesheet, baking in the dark palette at build time. So when the store correctly set `dataset.theme="light"`, the `[data-theme='light']` token overrides changed the CSS variables — but no utility class referenced a variable, so nothing visually flipped.

**The bug, and how it was caught:** the first Playwright capture (FXSW-046 verification) showed `dataset.theme="light"` set correctly on `<html>`, yet `bg-bg-app` / `text-text` elements stayed dark. The unit tests for the tokens (`tokens.test.ts`) and the config (`tailwind.config.test.ts`) were **green the whole time** — they assert *file content*, which was correct; they can't see that the compiled CSS bypassed the cascade. Only a rendering/visual gate surfaced it.

A further constraint: the codebase relies on Tailwind **opacity modifiers** (e.g. `bg-blue/85`, `border-ai-border/40`). A naive fix of pointing utilities at a full colour string (`var(--color-blue)` holding `#3b82f6`) breaks those modifiers — Tailwind can only inject an alpha value when the colour is expressed as channels it controls.

## Options considered

1. **Per-theme literal hex via a Tailwind dark-variant / `class` strategy.** Generate two sets of utilities and switch with a root class. Doubles colour utility output, couples every consumer to a `dark:`-style variant, and fights the existing token-driven design system. Rejected.
2. **CSS variables holding full colour strings** — `--color-blue: #3b82f6`, utilities use `var(--color-blue)`. Themes flip via the cascade, but **opacity modifiers stop working** (`bg-blue/85` can't compose an alpha onto an opaque `var()`). Rejected — would force rewriting every `/<alpha>` call site to a baked rgba token.
3. **RGB-triple variables + `rgb(var(--color-X) / <alpha-value>)`** *(chosen).* Store solid colours as **space-separated RGB channels** (`--color-blue: 59 130 246`) and reference them in Tailwind as `rgb(var(--color-blue) / <alpha-value>)`. Tailwind substitutes `<alpha-value>` (defaulting to `1`, or the modifier's value) at compile time while the channels stay a runtime variable — so utilities both **theme-flip via the cascade** and **keep opacity modifiers**.

## Decision

Adopt option 3.

- **Solid colour tokens** in `tokens.css` are space-separated RGB triples (e.g. `--color-bg-app: 10 10 15`) under `:root` (dark), with a `[data-theme='light']` block overriding each (e.g. `--color-bg-app: 246 246 248`).
- **`tailwind.config.ts`** maps those via a helper `solidColor(token) => `rgb(var(--color-${token}) / <alpha-value>)``, so every utility flips with `data-theme` and `bg-x/NN` opacity modifiers still compose.
- **Alpha-baked tokens** — overlays, glass, the AI panel wash, row-flash — keep their full `rgba(...)` form and are referenced directly with `var(--color-X)` (no `<alpha-value>`), because they are never used with an opacity modifier. Shadow tokens (`--shadow-panel`, `--shadow-ticket`, `--shadow-ai`) likewise use `var()` and have per-theme values.

## Consequences

**Positive:**
- A single `data-theme` attribute flip recolours the entire app through the CSS cascade, with no React re-render beyond the toggle's icon. Theming logic stays out of components.
- Opacity modifiers (`bg-blue/85`, etc.) keep working unchanged — no call-site churn across the codebase.
- The token file remains the single source of truth for colour; adding a future theme is "another `[data-theme='…']` block," not a config rewrite.

**Negative / cost:**
- Token values are now channel triples (`59 130 246`), which read less obviously than `#3b82f6`. The file header documents the convention.
- Two token "shapes" coexist (RGB-triple solids vs. `rgba()` alpha-baked), and a contributor must pick the right one: triple + `solidColor()` for anything used with an opacity modifier, baked `rgba()` + direct `var()` otherwise.

**Lesson (the reusable takeaway of the phase):** **file-content tests for design tokens are necessary but not sufficient.** `tokens.test.ts` and `tailwind.config.test.ts` asserted the right strings and stayed green while the rendered pipeline was wholly broken, because they never exercised compiled CSS against a live DOM. Anything whose correctness lives in the *rendering pipeline* (token cascade, theme flip, CSS-variable resolution) needs a Playwright / visual gate, not just a unit assertion on source text.

## Sources

- `docs/phase-summaries/FXSW-046-summary.md` — "Key bug uncovered + fixed"; Tailwind migration notes
- `docs/05-ui-ux-spec.md` §13–§14 — light-surface token spec
- `src/styles/tokens.css`, `tailwind.config.ts` — implementation (commit `a622dce`)
- Related: [ADR-0001](ADR-0001-vite-react-tailwind.md) (Tailwind choice), [ADR-0008](ADR-0008-ai-indigo-accent.md) (AI indigo, preserved across themes)
