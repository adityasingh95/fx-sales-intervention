---
phase: 5
ticket_range: FXSW-028 → FXSW-033
date: 2026-05-26
branch: claude/cool-planck-MeZgz
gate_counts:
  unit_tests: 316 pass / 0 todo
  e2e_tests: 6 pass (smoke + happy-path-esp + off-hours-intervention + credit-breach + size-limit-margin-tune + release-path)
  typecheck: clean
  lint: clean (--max-warnings 0)
  build: clean
  caplin_grep: dist/ Caplin-free on every commit's build
---

# Phase 5 Summary — Notifications + polish + ship

Builds on Phase 4's AI Margin Suggestion. End state: every SI deal that
needs a trader announces itself via a top-right toast, a `●`
document-title prefix, an amber row-flash, and (once the user has
unlocked WebAudio with their first click) a 180ms 880Hz chime — all
mutable from the header bell icon. The final Gherkin scenario
(RELEASE_PATH) is wired end-to-end, the shared Button + HoldButton
primitives are lifted to `src/components/`, CI runs typecheck + lint +
unit + Playwright on every push/PR, the README sells the demo, and
both deploy and CI workflows are green.

## What works

**FXSW-028 — Notifications visual layer.** Commit `227c96f`.
- `src/state/stores/notificationsStore.ts` (Zustand) — `toasts: Toast[]` plus a `notifiedDealIds: Set<string>` so re-Release of a previously-picked-up deal doesn't re-fire per `docs/02 §5.1`.
- `src/features/notifications/dispatcher.ts` — `dispatchNotifications(deals)` iterates the store, fires toast + title-flash for any deal that is SI-channel (`rejectionReasons.length > 0`) + `siState === 'Initial'` + `dealable` + not-yet-notified. `wireNotifications()` boots the subscription in `main.tsx`.
- `src/features/notifications/titleFlash.ts` — `flashDocumentTitle()` prefixes `● ` for 5s, idempotent on repeat. `_resetTitleFlash` test-only helper.
- `src/features/notifications/ToastStack.tsx` — top-right glass stack, 320px cards with `data-testid="toast-{dealId}"`. Click opens the ticket + dismisses; explicit `X` dismisses without opening.
- ActiveBlotter row gets `data-row-flash="new"` + `animate-row-flash` (300ms amber-30% → transparent fade) via a new `row-flash` keyframe in `global.css` and a Tailwind `animation` extension.
- All three SI E2Es (OFF_HOURS, CREDIT_BREACH, SIZE_LIMIT_MARGIN_TUNE) now assert the toast + title-prefix — the FXSW-028-deferred markers those specs had carried since Phase 3 are gone.
- 8 new tests.

**FXSW-029 — Audio chime + mute toggle + settingsStore.** Commit `5343219`.
- `src/state/stores/settingsStore.ts` — Zustand `muted: boolean` + `toggleMute()` / `setMuted()`. Reads/writes `si.muted` in sessionStorage, Safari-private-mode tolerant.
- `src/features/notifications/useNotificationSound.ts` — module-scoped lazy WebAudio context with a factory inject point (`_audio.setFactory`). Plays 180ms 880Hz sine via `OscillatorNode` + `GainNode` exponential ramp. Gates on `muted` flag + audio-unlocked flag; unlocks on first `click` or `keydown` on `document` per `docs/02 §5.3` autoplay policy. Hook fires one chime per growth of `notifiedDealIds.size`, not per render.
- `src/features/notifications/MuteToggle.tsx` — header `Bell` / `BellOff` icon with `aria-pressed` + `data-muted` + dynamic `aria-label`. Replaces the FXSW-006 placeholder `Volume2` button.
- 12 new tests.

**FXSW-030 — Visual polish pass (Button lift).** Commit `1befad9`.
- `src/components/Button.tsx` — shared `Button` + `HoldButton` primitives per `docs/05 §3.1`. 4 variants (`primary` / `secondary` / `danger` / `ghost`), 600ms hold-to-confirm or double-click semantics, `data-in-flight` + `data-holding` + `aria-describedby` hint, `holdgrow` keyframe overlay.
- `TicketFooter.tsx` and `SuggestionPanel.tsx` shed their inline copies. ~90 lines of duplicated primitive code removed; behavior contract preserved.
- The rest is eye-test polish (glass blur, gradient strip, AI panel glow, animation durations, hover + focus states, console-error sweep, responsive layout) handed off to the live URL.

**FXSW-031 — RELEASE_PATH E2E.** Commit `ad4cade`.
- `tests/e2e/release-path.spec.ts` (0.7s) — Scenario 5 verbatim. Inject → INTERVENE → click → ticket opens with siState=PickedUp + dealable=false + status=PICKED UP → click Release → ticket closes, siState=Initial, dealable=true, status returns to INTERVENE; row stays in Active (no removal because no terminal transition).
- TicketFooter Release handler now also calls `useUiStore.getState().closeTicket()` per Scenario 5's "ticket panel closes" assertion. Comment in the handler distinguishes the Release path (intentional Hold + close) from the passive Esc/backdrop close paths per `docs/02 §4.8` (which still don't auto-Hold).

**FXSW-032 — CI workflow.** Commit `d1ed41a`. ◐ pending first green run on `main`.
- `.github/workflows/ci.yml` per `docs/08 §6` — checkout → pnpm 10 → Node 20 with pnpm cache → install --frozen-lockfile → typecheck → lint → test:run → Playwright Chromium install → test:e2e. Uploads `test-results/` + `playwright-report/` as a `playwright-trace` artifact on any failure (7-day retention).
- Triggers on push to `main` / `claude/**` and on every pull request.

**FXSW-033 — README + demo recording.** Commit `ba88cca`. ◐ pending user-captured demo recording.
- README rewritten for the shipped state: CI + Deploy badges, "What it demonstrates" section with a five-scenario "what to look at" table in running order, CI section, demo-recording placeholder at `docs/demo.mp4`, expanded Docs section linking the full spec pack, Pages-environment branch-allow-list caveat under Deploy.
- Confirmed brand-neutral (no Caplin mentions per CLAUDE.md §1).

## What's rough or open

- **CI workflow needs its first green run** on `main` post-merge to flip FXSW-032 from ◐ → ☑. Watch the Actions tab after the PR merges.
- **Demo recording** is the one Phase 5 deliverable the cloud build environment can't produce — needs the user to screen-capture the five-scenario walk-through on the live URL and drop the file at `docs/demo.mp4` (or paste a GitHub Assets video URL into the HTML comment inside the README). FXSW-033 flips to ☑ once that lands.
- **`act()` warnings in the test output** still there — XState child-actor subscriptions firing outside React's `act()` scope, plus the new `Harness` components in the FXSW-029 tests. Tests pass, CI gates green; flagged in the FXSW-012 entry for a future polish pass and not worth blocking on.
- **Mute toggle has no visible "muted" affordance on the new-deal flash** beyond the icon swap. A trader who muted earlier won't get any audio cue on a new SI — that's by design, but the row-flash + toast + title-flash should compensate. No test coverage for the "muted + new deal still shows toast" case explicitly; both behaviours are independently tested.
- **Audio context isn't released on app unmount.** Singleton lives for the session; harmless in a prototype, would matter in a long-running multi-tab production app.

## What surprised you

- **The dispatcher-fires-once-per-deal contract** has two reasonable interpretations. Initial draft used `for ... of` over the deals map and called `markNotified` per iteration, which works because of the synchronous `hasNotified` guard but reads as fragile. Final version makes the gate explicit (`if (store.hasNotified(dealId)) continue`) and tests cover the re-Release-doesn't-re-fire case directly.
- **`useSettingsStore.setState` from outside a React render** doesn't trigger the act warning, but `fireEvent.click(document)` from inside an `act` block does. The MuteToggle tests learned this the hard way; the useNotificationSound tests sidestepped by wrapping the doc-click in `act`.
- **The audio unlock is one of the FXSW-029 tests'** more brittle paths. The hook installs the unlock listener inside a `useEffect`; if a test calls `fireEvent.click(document)` *before* the hook renders, the listener isn't attached and the click is lost. The `useNotificationSound.test.tsx` ordering — `render(<Harness />)` first, then the simulated user gesture — is what makes the lock/unlock test deterministic. Worth flagging because a future engineer might rearrange the test setup and silently regress the unlock check.
- **`data-row-flash` could be done with pure CSS `animation: row-flash 300ms` directly on the row**, no Tailwind utility needed. The Tailwind extension is "tidier" but the keyframe rule itself does all the work. Kept the Tailwind utility for consistency with the rest of the codebase's class-first styling.
- **README CI/Deploy badges fetched from `actions/workflows/*.yml/badge.svg`** assume the workflow files keep their current names. If FXSW-032's `ci.yml` ever gets renamed (e.g., to `tests.yml`), the badge would 404 silently. Not a problem to fix now; flagged so a future rename includes a README sweep.
- **TicketFooter's `import { Button as ActionButton, HoldButton }`** preserves the six existing `<ActionButton>` call sites unchanged. Saved a tedious rename that would have churned the diff for no behavior change.
- **Phase 5 added no new dependencies.** Same five libraries we've been on since Phase 1 (react, xstate, zustand, clsx, lucide-react). The doc-pack's pinned-stack discipline held across all five phases.

## Recommended next slice

**Phase 5 closes the build.** The prototype is feature-complete against
the original spec pack — all 5 scenarios runnable from the live URL,
all 6 E2Es green, all unit-test gates green, CI wired, README ready.
Two follow-ups are user-side:

1. Watch the CI run on `main` post-merge land green; flip FXSW-032 ☑.
2. Capture the 30–60s demo recording and drop it at `docs/demo.mp4`;
   flip FXSW-033 ☑.

Once both close, the project is shippable. There is no Phase 6.

Phase 5 work product lives on `claude/cool-planck-MeZgz` ahead of `main`
by 16 commits; the PR back to main + Wiki Agent ingest happen as a single
hand-off step. After the wiki sweep, run the final BACKLOG marker:

> 🧠 **End of Phase 5 — Final Wiki Agent sweep.** Save summary to
> `docs/phase-summaries/FXSW-033-summary.md` (this file). Wiki Agent:
> full ingest + full lint (all categories, all code-drift checks).
> Then rewrite `wiki/onboarding.md` from scratch using everything
> learned during the build.
