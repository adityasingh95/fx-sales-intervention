---
last_updated: 2026-06-11
sources:
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/FXSW-046-summary.md
status: stable
ticket: FXSW-044
---

# Component — Theme Store

The Zustand store that holds the active colour mode (`'dark' | 'light'`) and is the **only** writer of `document.documentElement.dataset.theme`. Drives the [light theme feature](../features/theme-switching.md); the [`ThemeToggle`](../features/theme-switching.md#toggle-ui--themetoggle) is its one UI consumer.

File: `src/state/stores/themeStore.ts`. Tests: `themeStore.test.ts`. SessionStorage key: `si.theme`.

## State shape

```typescript
export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;  // set an explicit mode
  toggle: () => void;                  // flip dark ↔ light
}
```

## Initial-mode resolution

At module load the store computes `resolveInitialMode()`, applies it to the DOM **once**, then seeds the Zustand state with it:

```typescript
function resolveInitialMode(): ThemeMode {
  if (!getThemePreviewEnabled()) return 'dark';      // flag off → force dark
  const stored = readStoredMode();                    // si.theme, if valid
  if (stored !== null) return stored;                 // sessionStorage wins
  return prefersLight() ? 'light' : 'dark';           // else system preference
}

const initialMode = resolveInitialMode();
applyDomTheme(initialMode);                           // dataset.theme = initialMode
```

Precedence when the flag is **on**: stored `si.theme` value → else `prefers-color-scheme: light` → else dark. When the flag is **off**: always `'dark'`, regardless of any stored or system value (force-dark). This is what keeps `main` dark-only and byte-for-byte unchanged without the flag.

### Helpers (all SSR / unavailability-guarded)

- `readStoredMode()` — reads `si.theme` from `sessionStorage`; returns the value only if it is exactly `'light'` or `'dark'`, else `null`. Wrapped in `try/catch` (Safari private mode can throw).
- `writeStoredMode(mode)` — best-effort `sessionStorage.setItem`; swallows failures.
- `prefersLight()` — `window.matchMedia('(prefers-color-scheme: light)').matches`; `false` if `matchMedia` is unavailable.
- `applyDomTheme(mode)` — `document.documentElement.dataset.theme = mode`. No-op under SSR (`typeof document === 'undefined'`).

Each helper guards `typeof window`/`document` so the store is import-safe in tests and any non-browser context (returns the dark default).

## Actions

Both writers do the same three things, in order — **persist (conditionally), apply to DOM, set React state**:

```typescript
setMode: (mode) => {
  if (getThemePreviewEnabled()) writeStoredMode(mode); // only persist when flag on
  applyDomTheme(mode);
  set({ mode });
},
toggle: () => {
  const next = get().mode === 'dark' ? 'light' : 'dark';
  if (getThemePreviewEnabled()) writeStoredMode(next);
  applyDomTheme(next);
  set({ mode: next });
},
```

Note the **`sessionStorage` write is gated on the flag** — even if `setMode`/`toggle` were somehow called with the flag off, nothing is persisted, so a later flagged visit isn't polluted by an off-flag write.

## Why the DOM write, not React, themes the app

The store sets a single attribute (`data-theme`) on `<html>`. The actual recolouring happens entirely in CSS: `tokens.css` overrides every colour token under `[data-theme='light']`, and Tailwind utilities read those tokens via `rgb(var(--color-X) / <alpha-value>)`. So one attribute flip cascades to every styled element with **no component re-render** beyond the toggle's own icon swap. The reason this routing works at all — and the literal-hex bug that broke the first attempt — is [ADR-0011](../decisions/ADR-0011-tailwind-rgb-variable-tokens.md).

## Relationship to other stores

Parallel to the other Zustand UI/transient stores ([deals-store](deals-store.md), settings, ui, notifications) per [ADR-0003](../decisions/ADR-0003-xstate-zustand.md) — theme is pure UI state, not deal-lifecycle state, so it lives in Zustand, not XState. Persistence is limited to a small UI preference in `sessionStorage`, consistent with the prototype's persistence rule.

## Tests

`src/state/stores/themeStore.test.ts` covers: flag-off forces dark (ignoring stored + system); flag-on first-visit follows `prefers-color-scheme`; flag-on returning-visit prefers the stored `si.theme`; invalid stored values fall through; `setMode` / `toggle` write `dataset.theme` and (flag-on) `sessionStorage`; flag-off `setMode` doesn't persist. `matchMedia` / `sessionStorage` are mocked. Companion: `src/lib/themeMode.test.ts` for the URL gate.

## Sources

- `docs/phase-summaries/FXSW-046-summary.md` — store responsibilities, resolution rules
- `docs/05-ui-ux-spec.md` §13–§14 — theme behaviour spec
- `docs/dev-log.md` FXSW-044 — implementation notes
- Commit `a622dce` (Phase 7)
