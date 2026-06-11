---
last_updated: 2026-06-11
sources:
  - docs/02-functional-spec.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/FXSW-046-summary.md
status: stable
ticket: FXSW-043..FXSW-046
---

# Feature — Theme Switching (Light Theme)

An **opt-in light theme** layered over the default dark workstation, gated behind the `?theme=preview` URL flag. When the flag is absent — the default on `main` — the app is **dark-only**, byte-for-byte unchanged: no toggle renders, and dark is forced regardless of any stored value or the operating system's colour-scheme preference. The flag is **orthogonal to `?dev=v2`** (the [dev-version gate](../components/dev-injector.md)); the two compose freely (`?dev=v2&theme=preview`).

Landed Phase 7 (FXSW-043 → FXSW-046). The runtime state lives in the [theme store](../components/theme-store.md); the cascade mechanics that let Tailwind utilities flip colour are captured in [ADR-0011](../decisions/ADR-0011-tailwind-rgb-variable-tokens.md).

## The `?theme=preview` URL gate

`src/lib/themeMode.ts` is a small, pure URL-gate module that **mirrors `devVersion.ts`** — the same shape the project uses for every preview flag:

```typescript
export function parseThemePreviewEnabled(search: string): boolean {
  return new URLSearchParams(search).get('theme') === 'preview';
}

export function getThemePreviewEnabled(): boolean {
  if (typeof window === 'undefined') return false;       // SSR / test guard
  return parseThemePreviewEnabled(window.location.search);
}
```

- `parseThemePreviewEnabled(search)` is the **pure** half — a string in, a boolean out — so it is trivially unit-testable with no `window`.
- `getThemePreviewEnabled()` is the **window-guarded** half — returns `false` (flag off) under SSR / non-browser contexts, otherwise reads `window.location.search`.

This pure-parser + guarded-getter split is the shared **URL-gate pattern**: see `devVersion.ts` (`?dev=v2`) and `themeMode.ts` (`?theme=preview`). Each flag is independent — they are separate query params read by separate modules — so any combination composes.

## Toggle UI — `ThemeToggle`

`src/features/notifications/ThemeToggle.tsx`, co-located with `MuteToggle` and mounted in the header just before it (`<ThemeToggle />` then `<MuteToggle />`).

- **Returns `null` when `getThemePreviewEnabled()` is false** — so with no flag the header is byte-for-byte identical to pre-Phase-7 `main`.
- Icon reflects the **target**, not the current mode: `Sun` when dark is active (click → light), `Moon` when light is active (click → dark). Both from `lucide-react`.
- `onClick` calls the store's `toggle()`.

### Test contract

```html
<button
  data-testid="theme-toggle"
  data-theme-mode="dark"            <!-- 'dark' | 'light' -->
  aria-label="Switch to light theme" <!-- target-mode phrasing -->
  aria-pressed="false"               <!-- true when light is active -->
>…</button>
```

`data-theme-mode` mirrors the active mode; `aria-pressed` is `true` in light. Absence of `theme-toggle` from the DOM is how a test asserts the flag-off path.

## How surfaces actually flip

The toggle and store only set `document.documentElement.dataset.theme` to `'dark'` or `'light'`. Everything visual follows from CSS:

- `src/styles/tokens.css` defines every colour token under `:root` (dark) with a `[data-theme='light']` override block.
- Tailwind utilities resolve those tokens through `rgb(var(--color-X) / <alpha-value>)`, so flipping `data-theme` cascades to every utility-styled element **without re-rendering React**. The migration that made this work — and the bug that forced it — is [ADR-0011](../decisions/ADR-0011-tailwind-rgb-variable-tokens.md).

The **indigo AI accent is preserved across both themes** as the suggestion-panel identifier (hue held, value shifted: dark `129 140 248` → light `79 70 229`), consistent with [ADR-0008](../decisions/ADR-0008-ai-indigo-accent.md). Status pills and BUY-green / SELL-red are darkened on the light surface for legibility; the row-flash amber alpha drops from `0.3` (dark) to `0.18` (light) so it doesn't oversaturate white.

## Behaviour summary

| Condition | Toggle | Default mode | Persistence |
|---|---|---|---|
| No `?theme=preview` | absent | dark (forced) | none written |
| `?theme=preview`, first visit, system dark | visible (Sun) | dark | — |
| `?theme=preview`, first visit, system light | visible (Moon) | light | — |
| `?theme=preview`, returning visit | visible | the stored mode | `sessionStorage` wins over system |

First-visit default reads `prefers-color-scheme`; thereafter the `sessionStorage` value (`si.theme`) wins on reload. Full resolution + write rules: [theme store](../components/theme-store.md).

## Tests

- `src/lib/themeMode.test.ts` — pure parser across `theme=preview` / absent / other values; guarded getter.
- `src/state/stores/themeStore.test.ts` — see [theme store](../components/theme-store.md) §Tests (resolution matrix, force-dark when flag off, `dataset.theme` writes, `sessionStorage` round-trip).
- `src/features/notifications/ThemeToggle.test.tsx` — null when flag off; Sun/Moon per mode; click toggles; `aria-pressed` / `data-theme-mode`.

Phase 7 added +43 unit tests (379 → 422); the 6 E2Es pass unchanged (no scenario regression). There is deliberately **no e2e for the toggle** — it's unit-tested at the component level and a single button doesn't warrant a browser spec.

## Known limitations / follow-ups

- **Preview-gated, not GA.** The force-dark branches exist only because the theme is opt-in. A future ticket (the summary suggests `FXSW-047`) can strip the `themePreviewEnabled === false` force-dark paths and promote light + dark to a first-class user setting.
- **No Sun↔Moon cross-fade.** `docs/05-ui-ux-spec.md` §13.3 mentions a 200ms cross-fade; deferred — the instant swap matches `MuteToggle`.
- **AI accent on light** is visually preserved but the light indigo (`#4f46e5`) is darker than dark-mode (`#818cf8`); flagged for a designer eye.

## Sources

- `docs/phase-summaries/FXSW-046-summary.md` — phase summary, architecture, verification matrix
- `docs/02-functional-spec.md` §8 — theme-preview functional amendment
- `docs/05-ui-ux-spec.md` §13–§14 — light-surface visual spec
- `docs/dev-log.md` FXSW-043 → FXSW-046 — per-ticket notes
- Commit `a622dce` (Phase 7 squash-merge to `main`)
