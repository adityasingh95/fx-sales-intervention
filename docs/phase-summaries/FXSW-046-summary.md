# Phase 7 — Light Theme (FXSW-043 → FXSW-046)

End-of-phase summary for the Wiki Agent ingest. Lands on `dev/light-mode` behind the `?theme=preview` URL gate; dark-only behaviour on `main` is preserved byte-for-byte when the flag is absent.

## Scope landed

| ID | Title | Effort | TDD | Commit |
|---|---|---|---|---|
| FXSW-043 | `themePreviewEnabled` parser + `?theme=preview` URL gate | S | Strict | `feat(FXSW-043): themePreviewEnabled parser + ?theme=preview URL gate` |
| FXSW-044 | `themeStore` + light token block in `tokens.css` | M | Strict | `feat(FXSW-044): themeStore + light token block in tokens.css` |
| FXSW-045 | `ThemeToggle` header component | S | Alongside | `feat(FXSW-045): ThemeToggle header component` |
| FXSW-046 | Per-surface visual rebalancing + Tailwind variable migration | M | Alongside | (this commit) |

## Architecture

- **URL gate**: `src/lib/themeMode.ts` — pure parser + `window`-guarded getter. Mirrors `devVersion.ts`. Orthogonal to `?dev=v2`; both flags compose.
- **Store**: `src/state/stores/themeStore.ts` — Zustand, sessionStorage key `si.theme`. Reads `prefers-color-scheme` as first-visit default when the flag is on; force-dark when the flag is off (regardless of stored or system value). Writes `document.documentElement.dataset.theme` at init and on every `setMode` / `toggle`.
- **Tokens**: `src/styles/tokens.css` defines colour tokens as space-separated RGB triples (e.g. `--color-bg-app: 10 10 15`) under `:root` (dark), with a `[data-theme='light']` block overriding every token. Alpha-baked tokens (overlays, glass, AI wash, row-flash) stay as `rgba(...)` strings.
- **Tailwind**: `tailwind.config.ts` references tokens via `rgb(var(--color-X) / <alpha-value>)` so utility classes theme-flip via the cascade AND keep opacity modifiers (`bg-blue/85` still works).
- **Toggle UI**: `src/features/notifications/ThemeToggle.tsx` — co-located with `MuteToggle`. Sun icon when dark is active (target = light), Moon when light is active. Returns `null` when the flag is off — header layout byte-for-byte unchanged on `main`.

## Verification

Manual Playwright pass at 1440×900 across 14 visual states (5 base + 2 v2 scenarios × dark + light). Key findings:

- ✅ No flag → toggle absent, dark forced regardless of system preference.
- ✅ `?theme=preview` + `prefers-color-scheme: dark` → dark default, toggle visible (Sun icon).
- ✅ `?theme=preview` + `prefers-color-scheme: light` → light default, toggle visible (Moon icon).
- ✅ Click toggle → mode switches across all surfaces (body, blotters, ticket panel, AI suggestion, dev injector, toast).
- ✅ Reload → sessionStorage value wins over system preference.
- ✅ Indigo AI accent preserved in both themes (suggestion panel border, sparkle icon).
- ✅ Status pills (PICKED UP, INTERVENE, AUTO, DONE) and side colours (BUY green / SELL red) darkened on light surface, remain legible.
- ✅ Row-flash amber alpha lowered to 0.18 on light (vs 0.3 on dark) — doesn't oversaturate white.
- ✅ Toast chrome adapts (`--color-bg-glass` per-theme).
- ✅ Resize handle hover + drag states work in both themes.
- ✅ Mobile card-stack (v2) renders cleanly in light at <md viewport.

Screenshots: `/tmp/light-mode-verify/` (dev-only artefacts, not committed). Sent to user during the verification step for review.

### Key bug uncovered + fixed

First Playwright capture revealed that `dataset.theme="light"` was being set correctly but Tailwind-styled elements (`bg-bg-app`, `text-text`, etc.) were not flipping — they had compiled to literal hex values from the previous `tailwind.config.ts`. The migration to `rgb(var(--color-X) / <alpha-value>)` (FXSW-046 main commit) routes Tailwind utilities through the variable cascade so they actually respect the `[data-theme]` selector. Reminder for future: file-content tests for design tokens are necessary but not sufficient; the rendering pipeline needs a Playwright/visual gate.

## Gates

| Gate | Before phase | After phase |
|---|---|---|
| typecheck | ✓ | ✓ |
| lint (`--max-warnings 0`) | ✓ | ✓ |
| test:run | 379 pass | 422 pass (+43 new) |
| test:e2e | 6 pass | 6 pass (no scenario regression) |
| build | ✓ | ✓ |
| brand-neutral grep (`caplin` in `dist/`) | 0 | 0 |

## Files touched

**New:**
- `src/lib/themeMode.ts`
- `src/lib/themeMode.test.ts`
- `src/state/stores/themeStore.ts`
- `src/state/stores/themeStore.test.ts`
- `src/features/notifications/ThemeToggle.tsx`
- `src/features/notifications/ThemeToggle.test.tsx`
- `docs/phase-summaries/FXSW-046-summary.md` (this file)

**Modified:**
- `src/styles/tokens.css` — RGB-triple migration + new `[data-theme='light']` block.
- `src/styles/global.css` — body bg + colour switched to `rgb(var(...))`. Row-flash keyframe references `--color-row-flash` token.
- `tailwind.config.ts` — colour utilities use `rgb(var(...) / <alpha-value>)` + alpha-baked direct refs + shadow tokens use `var()`.
- `src/App.tsx` — `<ThemeToggle />` mounted in header before `<MuteToggle />`.
- `tests/unit/tokens.test.ts` — assertions updated to RGB-triple format + 14 new for light overrides.
- `tests/unit/tailwind.config.test.ts` — assertions updated to `rgb(var(...) / <alpha-value>)` format + new light/dark passthrough block.
- `docs/02-functional-spec.md` — new §8 (Stage 1 spec amendment).
- `docs/05-ui-ux-spec.md` — new §13 + §14 (Stage 1).
- `docs/BACKLOG.md` — Phase 7 section + tickets FXSW-043 → FXSW-046 (Stage 1).
- `docs/dev-log.md` — per-ticket entries.

## Out of scope (deliberate)

- No promotion to `main`. The branch stays long-lived; promotion is a separate step once the user has manually previewed.
- No e2e test for the toggle itself. The toggle's behaviour is unit-tested at the component level; an e2e is overkill for a single button and would slow CI. If/when the toggle becomes part of a critical user flow, add one then.
- No fade transition between Sun and Moon icons. Spec §13.3 mentions a 200ms cross-fade; deferred for now since the instant swap matches `MuteToggle`'s pattern.

## Follow-ups for next phase

- **v1 fallback strip**: when light theme is promoted to general availability, an FXSW-047 (or similar) can strip the `themePreviewEnabled === false` force-dark branches and bake light + dark as a first-class user setting.
- **AI accent rebalancing on light**: the spec says indigo is preserved as the AI identifier across both modes — visually true, but the light-mode `#4f46e5` is darker than the dark-mode `#818cf8`. Worth a designer eye to confirm the AI surface still reads as the "moment of delight" rather than blending into the rest of the chrome.
- **Wiki Agent ingest** of this phase summary; updates affected pages (`overview.md`, `features/`, new `components/theme-store.md`, decisions ADR for the variable migration).
