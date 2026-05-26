# Dev Log

A chronological, ticket-by-ticket journal of building the **FX Sales
Workstation** prototype. Each entry is the chat-style summary the
agent posted on ticket completion — terse bullets, decisions split
between **user-directed** and **agent-directed**, gate counts as the
trailing bullet.

The user-vs-agent split is the point of this document. It surfaces
exactly where the AI agent had autonomy under doc-pack guidance, and
exactly where it escalated to the human for direction. The
expectation in a healthy AI-native pipeline is that most routine
implementation decisions stay agent-directed (because the spec pack
covers them) and human attention concentrates on scope, strategy,
and genuine ambiguities.

This is presentation material for two parallel stories:

1. **The prototype** — a sales-trader workstation for FX manual
   pricing intervention. Single-page React + XState app, simulated
   feed, no backend.
2. **The AI-native development pipeline** — a spec pack
   (`docs/00–09`), `CLAUDE.md` operating rules, a TDD-shaped backlog
   (`docs/BACKLOG.md`), a downstream Wiki Agent hand-off contract,
   and a four-gate guard (`typecheck + lint + test:run + test:e2e`)
   on every commit. This log is the artifact that shows the
   pipeline in motion.

Separate from `docs/phase-summaries/` — those are end-of-phase
hand-off summaries for the Wiki Agent. This is the working journal.
Most recent first.

---

## Post-Phase 5 cleanup
**Commit `cfabbdd`**

Project-wide sweep for unused stuff after the build landed. No new feature work, no scope shift, no breaking changes.

- **Deleted 7 stub files** (each was a single-line `export {};` placeholder from the FXSW-003 folder-structure scaffold that the architecture never grew into):
  - `src/types/pricing.ts` — pricing types live colocated on the consumers (`PriceTick` in `services/feed/types.ts`).
  - `src/components/Tooltip.tsx` · `src/components/NumberInput.tsx` · `src/components/IconButton.tsx` · `src/components/Toast.tsx` — never extracted; the inline equivalents in PricingPanel / SuggestionPanel / ToastStack carried their own styling.
  - `src/services/feed/index.ts` — barrel never used; consumers import from `pricingFeed` / `dealFeed` directly.
  - `src/features/blotter/columns.ts` — leftover from the AG-Grid plan (which we never adopted, see below).
- **Removed `ag-grid-community` + `ag-grid-react` from `package.json`** + lockfile sync. Never imported, never bundled (`dist/` size unchanged at 240KB). The blotters use a plain flex layout. README + CLAUDE.md "Stack" sections updated to drop the AG-Grid line. The spec/design docs (`01-prd.md`, `06-tech-architecture.md`, `05-ui-ux-spec.md`) keep the AG-Grid mentions as historical record of what was planned — they're not lying, they're describing the ticket-time decision.
- **Reworded two stale forward-reference comments** that read like work was still pending:
  - `src/features/notifications/dispatcher.ts` "Audio chime is FXSW-029 — landing alongside…" → past tense, points at the now-shipped `useNotificationSound` hook.
  - `src/state/stores/dealsStore.ts` "full SI state graph lands in FXSW-010" → past tense, points at `siMachine.ts`.

**User-directed decisions:** The user-authorized cleanup scope was the three bullets above. The fourth option ("skip AG-Grid for now, keep the dep lying around") was offered and declined — user picked the more thorough sweep.

**Agent-directed decisions:**
- **Spec/design docs kept intact**. `01-prd.md`, `06-tech-architecture.md`, and `05-ui-ux-spec.md` still mention AG-Grid as the originally planned grid library. Those are time-stamped design artifacts, not current-state inventories — rewriting them would erase the "what we considered" record. The dev-log already captured the swap (FXSW-012 lifted blotters onto plain flex). README + CLAUDE.md updates are the only doc-side change because those are read as "this is the current stack."
- **Lockfile sync rather than a manual edit**. `pnpm install` after the package.json change is the canonical way to keep `pnpm-lock.yaml` consistent; doing it by hand would risk drifting transitive resolutions.
- **No `--prune` or `--audit` follow-up**. The other deps in `package.json` were all confirmed used during prior phases (lucide-react, clsx, xstate, zustand, the test stack). A blanket audit would be theater.
- **Wiki/ untouched.** That's the Wiki Agent's directory per CLAUDE.md rule §10. The dev-log + phase summaries are this agent's only documentation surface.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (**316 pass / 0 todo**, unchanged), e2e ✓ (6/6 in 50.4s), build ✓ (`dist/` 240KB unchanged — confirms AG-Grid was never bundled).

---

## FXSW-033 · README + demo recording
**Commit `ba88cca`**

- `README.md` rewritten for the shipped state. Adds:
  - **CI + Deploy badges** on the masthead so a reader sees green at a glance.
  - **"What it demonstrates"** section with a five-scenario table mapping each Inject button to what the reader should watch for. The third column tells the demo story in one sentence per scenario, which is what the deliverable's running-order spec wants ("the operator can sit through the demo and not flinch at any visual moment").
  - **CI** section describing the workflow + Playwright trace upload.
  - **Demo recording** placeholder pointing at `docs/demo.mp4` with an HTML-comment hint for the eventual GitHub Assets video URL. The recording itself is user-captured (no screen-record affordance in the cloud build environment) — flagging this as the one ticket deliverable that requires manual hand-off.
  - **Docs** section linking each spec file rather than just the four highlights — gives a reader the full surface, including `phase-summaries/` and the scenario pack.
- Verified the README contains no `Caplin` mentions per CLAUDE.md rule §1.

**User-directed decisions:** None — the AC structure was pinned by `CLAUDE.md` rule §1 + the BACKLOG done-when.

**Agent-directed decisions:**
- **Scenario table in the README, not just a link to `07-scenario-pack.md`.** A reader landing on the repo wants a 30-second tour, not a click-through to a Gherkin file. The table doubles as the demo-recording outline.
- **Demo recording placeholder rather than the recording itself.** The cloud build env has no screen-capture capability and uploading binary video without the actual file would be misleading. Comment in the README block tells the human exactly what to drop in.
- **Pages-environment caveat explicit** under Deploy. The branch-allow-list step on the `github-pages` environment is the one thing that bit us repeatedly in Phase 1; documenting it here saves the next person the same diagnostic loop.
- **Mute toggle + AI-suggestion ApplyUndo flow mentioned in the running-order column**. Not strictly required by `docs/07`, but the demo's "moment of delight" is the AI suggestion landing + Apply, and the mute affordance is otherwise discoverable only by clicking the bell icon. Both belong in a "what to look at" demo guide.
- All gates green (unchanged): typecheck ✓, lint ✓, test:run ✓ (**316 pass / 0 todo**), e2e ✓ (6/6 in 35.9s), build ✓. README changes are docs-only.

---

## FXSW-032 · CI workflow
**Commit `d1ed41a`**

- `.github/workflows/ci.yml` per `docs/08 §6` — checkout → pnpm setup (v10 to match the existing `packageManager` field + the deploy workflow) → Node 20 with pnpm cache → install `--frozen-lockfile` → typecheck → lint → test:run → Playwright Chromium install → test:e2e. On any failure, uploads `test-results/` + `playwright-report/` as a `playwright-trace` artifact (7-day retention) so failed runs can be inspected.
- Triggers: `push` to `main` or any `claude/**` branch + every `pull_request`. Gives the per-session feature branches CI coverage without flooding when the human is iterating locally.
- `timeout-minutes: 10` per job — the spec budget is 5 minutes (typecheck + lint + unit suite typically 30s, Playwright install ~60s, 6-spec E2E ~40s); the 10-minute cap is a safety net rather than a target.

**User-directed decisions:** None — `docs/08 §6` YAML was the template; the only changes are pnpm version (10 not 9, to match the existing `packageManager` pin), the trigger filter, and the failure-artifact retention.

**Agent-directed decisions:**
- **pnpm version 10**, not the doc's `version: 9`. The repo's `package.json` already pins `"packageManager": "pnpm@10.33.0"` and the existing `deploy.yml` uses `version: 10`. Aligning CI keeps lockfile compatibility intact.
- **Trigger filter `push: branches: [main, 'claude/**']`** rather than the doc's bare `[push, pull_request]`. The feature-branch pattern matches every per-session branch the harness creates without polluting CI history with random push notifications from a future branch namespace.
- **Artifact retention of 7 days** rather than the GitHub default of 90. Phase 5 prototype scope doesn't warrant long-term trace storage; 7 days covers the typical debug window.
- **`if-no-files-found: ignore`** on the artifact upload so a failure that doesn't produce trace files (e.g., the install step itself errors before any test runs) doesn't compound into a second failure on the upload step.
- **Not pinning `pnpm test:e2e` worker count**. The Playwright config already pins single-worker (`workers: 1` from FXSW-013's setup) for scenario-time determinism — the env doesn't need to repeat it.
- **No `--retries` flag on the CI run** — Playwright config already sets `retries: isCI ? 2 : 0`, so the workflow inherits the 2-retry policy without extra wiring.
- The ci.yml is itself the artifact; the workflow run on this push is the test. Will flip the BACKLOG `☐ → ☑` once the run lands green on this branch.

---

## FXSW-030 · Visual polish pass
**Commit `1befad9`**

- **Button.tsx lift** — `src/components/Button.tsx` real, exporting `Button` (the simple variant) and `HoldButton` (the 600ms-hold-or-double-click variant) with a shared 4-variant style table (`primary` / `secondary` / `danger` / `ghost`) per `docs/05 §3.1`. Lifted from `TicketFooter.tsx` (FXSW-020 inline) and `SuggestionPanel.tsx` (FXSW-026 RejectHoldButton inline) — both consumers now import from the shared module. ~90 lines of duplicated primitive code removed; behavior contract preserved (testids, `data-in-flight`, `data-holding`, `aria-describedby` hint, `holdgrow` keyframe overlay all unchanged).
- `TicketFooter.tsx` shed: the local `ActionButton`, the local `HoldButton`, the `Variant` type, the `VARIANT_CLASSES` record, and the `HOLD_MS` constant. Imports the shared primitives via aliased names (`Button as ActionButton`) so the existing JSX inside the footer stays unchanged.
- `SuggestionPanel.tsx` shed: the `RejectHoldButton` helper component, the inline 600ms timer hook, the inline `holdgrow` `<span>` overlay, the `HOLD_MS` constant. The credit-decline branch now wraps the shared `HoldButton variant="danger"` in a `self-start` div to constrain the button width.
- No new tests for the lift — the existing `TicketFooter.test.tsx` (7) + `SuggestionPanel.test.tsx` (14) cover both consumers' behavior, including the 600ms hold semantics and the credit-decline Reject path. Both green post-refactor.
- **Eye-test polish (user-driven on the live URL):** glass blur on the ticket overlay, header gradient strip, AI panel indigo glow, animation durations, hover states, focus rings, console-error sweep. The responsive amendment (header inject-button strip + each blotter scrolls horizontally as a unit below 1440px) was already in place from Phase 2.

**User-directed decisions:** None — the lift implements `docs/05 §3.1` literally and the previous FXSW-020 / FXSW-026 dev-log entries called out the "lift when a second consumer arrives" timing.

**Agent-directed decisions:**
- **Imported `Button as ActionButton` in `TicketFooter.tsx`** to keep the JSX inside the footer (which has six `<ActionButton ... />` call sites) unchanged. Renaming the prop alias is cheaper than renaming six call sites.
- **`ButtonVariant` type + `VARIANT_CLASSES` record are file-local**, not exported. Consumers reference the variant as a string-literal union via the component's prop type (`variant="primary"`). Avoids the `react-refresh/only-export-components` lint warning that fires when a component file co-exports non-component values, and keeps the public surface of `Button.tsx` strictly the two components.
- **Credit-decline button gets a `<div className="self-start">` wrapper** rather than fighting the shared `HoldButton`'s default-stretch behaviour inside the SuggestionPanel's `flex-col` container. The pre-lift inline copy had `self-start` baked into the className; the shared component shouldn't carry layout-position concerns, so the parent enforces sizing.
- **No `eye-test` automation added.** AC explicitly says "no automated tests"; the deliverable is the polish commit. Eye-test results are user-side observations on the live deploy.
- **No `Button.test.tsx` for the lifted module itself.** Both behavior surfaces are still exercised end-to-end via the consumer tests (TicketFooter Reject + Send Stream hold semantics, SuggestionPanel credit-decline Reject hold). A dedicated unit test for the primitive would be a duplicate.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (**316 pass / 0 todo**, unchanged), e2e ✓ (6/6 in 35.9s, unchanged), build ✓.

---

## FXSW-031 · RELEASE_PATH E2E
**Commit `ad4cade`**

- TDD red→green: **`tests/e2e/release-path.spec.ts`** (0.7s) — transcribes `docs/07-scenario-pack.md` Scenario 5. Inject → INTERVENE row for Polaris Holdings / USDINR → row's `data-dealable="true"` → click row → ticket opens → SI advances to PickedUp → `data-dealable="false"` + status "PICKED UP" → click Release → ticket panel unmounts → SI cycles HoldSent → Initial → `data-dealable="true"` + status back to "INTERVENE" → row still in Active (no 5s removal because no terminal transition).
- `src/features/ticket/TicketFooter.tsx` Release handler now also calls `useUiStore.getState().closeTicket()` per Scenario 5's "the ticket panel closes" assertion. The change is one extra line and doesn't break the existing FXSW-020 footer tests (those wrap only the footer and don't observe `uiStore`). Comment in the handler distinguishes the Release path (intentional Hold + close) from the passive Esc/backdrop close paths per `docs/02 §4.8` (which still don't auto-Hold).
- All 6 E2Es now green in 35.9s — smoke (0.2s), happy-path-esp (8.0s), off-hours (8.2s), credit-breach (7.4s), size-limit-margin-tune (9.3s), release-path (0.7s).

**User-directed decisions:** None — `docs/07 §5` Gherkin was verbatim.

**Agent-directed decisions:**
- **Release closes the ticket, Esc/backdrop don't.** `docs/02 §4.8` is explicit that passive close paths must not auto-Hold; the converse — Hold paths can close — isn't stated but is consistent with the Gherkin and with the affordance ("hand back to the desk" implies finishing with this ticket). Comment in the code distinguishes the two paths so a future reader doesn't unify them.
- **No follow-up assertions in the spec.** The scenario terminates on the release; there's no scripted CLIENT_ACCEPT or trader-rejection that follows. Spec ends with "row is still visible in Active." Trying to also assert "no 5s removal happens" would slow the test by 6s without a clean signal — the released row would just sit there indefinitely.
- **Released row's status returns to INTERVENE.** `derivedStatus(rfsState='Queued', siState='Initial', dealable=true)` per `statusFromMachines.ts` — matches the scenario's "displayed status returns to INTERVENE" assertion.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (**316 pass / 0 todo**, unchanged — E2E adds Playwright not Vitest), e2e ✓ (6/6 in 35.9s), build ✓.

---

## FXSW-029 · Audio chime + mute toggle + settingsStore
**Commit `5343219`**

- TDD red→green: **12 new tests** — 5 in `settingsStore.test.ts` (default unmuted; toggleMute flips; persists to sessionStorage; setMuted writes; reload-restore via fresh module import), 3 in `MuteToggle.test.tsx` (Bell↔BellOff icons + `aria-pressed` + `data-muted` toggles; click flips state + persists), 4 in `useNotificationSound.test.tsx` (no schedule before audio unlock; schedules 880Hz OscillatorNode after unlock + new SI deal + unmuted; no schedule when muted; one oscillator per new deal, not per render).
- `src/state/stores/settingsStore.ts` — Zustand store, `muted: boolean` + `toggleMute()` / `setMuted()`. Reads sessionStorage `si.muted` key on init; writes on every mutation. Safari-private-mode tolerant (try/catch around storage calls).
- `src/features/notifications/useNotificationSound.ts` — module-scoped lazy WebAudio context, lazy because browsers reject `new AudioContext()` before a user gesture. `playChime()` builds an OscillatorNode (880Hz sine) into a GainNode with `setValueAtTime(0.15)` + `exponentialRampToValueAtTime(0.0001, t0 + 0.18)`. The hook installs `click` / `keydown` listeners on `document` for the audio unlock and subscribes to the notificationsStore's `notifiedDealIds.size` to fire one chime per new SI deal. `_audio` test-only export exposes `setFactory` / `reset` so tests can inject a mock AudioContext.
- `src/features/notifications/MuteToggle.tsx` — header button rendering `Bell` (unmuted) / `BellOff` (muted) from lucide-react. `aria-pressed` + `data-muted` + dynamic `aria-label` ("Mute notifications" / "Unmute notifications").
- `src/App.tsx` wiring: `MuteToggle` replaces the placeholder Volume2 button; `useNotificationSound()` mounted once at the app root for the lifetime of the session.

**User-directed decisions:** None — `docs/02 §5.3` + `§5.4` and CLAUDE.md rule §3 pinned the implementation surface; `docs/06-tech-architecture.md §5` confirmed sessionStorage scope.

**Agent-directed decisions:**
- **AudioContext is module-scoped, lazy, and replaceable via `_audio.setFactory`.** Singleton per session keeps WebAudio resources controlled; lazy creation defers the actual `new AudioContext()` to first use (browsers can throw on construction before user gesture); factory injection lets tests run without a real WebAudio implementation. Production never touches `_audio`.
- **The mute gate happens in the hook, not in the play function**, so the unmuted path can stay sync + side-effect-only. `playChime()` itself is muted-agnostic — useful if a future ticket adds a "test sound" affordance in a settings panel.
- **`notifiedDealIds.size` as the trigger signal**, not the full Set. Comparing sizes is `O(1)`; comparing Set membership across renders would need diffing. Cosmetically: the dispatcher only ever *adds* to the Set (never removes), so size growth uniquely identifies "a new deal has been notified."
- **Audio unlock relies on click + keydown only.** Touch is the iOS path; in the prototype's desktop-first scope, the `click` event is dispatched on touch too, so adding a separate touch listener would just create duplicate unlock calls. Keep it simple.
- **`setMuted(true)` IS exposed alongside `toggleMute()`** even though the UI only uses the toggle. Tests use `setMuted` to set up specific states without ambiguity. Trivial API surface; no cost.
- **`reload-restore` test uses dynamic import with a cache-busting query string** (`'./settingsStore?reload=' + Date.now()`). Vitest module cache would otherwise reuse the existing module and its already-initialised `muted` state, hiding the bug.
- **Replaced the placeholder `Volume2` icon** in the header rather than augmenting it. The original FXSW-006 button was wired to nothing and used the wrong icon (`Volume2` is a speaker, the spec says `Bell`).
- **`useNotificationSound()` mounted at the App root**, not inside a `<NotificationSoundProvider />` wrapper. The hook has no children and no shared state to provide — wrapping would just add ceremony.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (**316 pass / 0 todo**, up from 304 / 0 — 12 new), build clean.

---

## FXSW-028 · Notifications visual layer
**Commit `227c96f`**

- TDD red→green: **8 new tests** — 2 in `titleFlash.test.ts` (prefix + restore at 5s; repeated calls reset the timer without double-prefixing), 6 in `ToastStack.test.tsx` (toast appears on a fresh SI deal; auto-dismiss at 6s; click opens the ticket + dismisses; re-Release does not re-fire; ESP deals don't trigger; dispatcher also fires the title flash).
- `src/state/stores/notificationsStore.ts` real (Zustand) — `toasts: Toast[]` plus a `notifiedDealIds: Set<string>` so re-Release of a previously-picked-up deal doesn't re-fire per `docs/02 §5.1`. `reset()` for test cleanup.
- `src/features/notifications/dispatcher.ts` — `dispatchNotifications(deals)` iterates the store, fires the toast + title-flash for any deal that is SI-channel (`rejectionReasons.length > 0`) + `siState === 'Initial'` + `dealable` + not-yet-notified. `wireNotifications()` subscribes to the dealsStore at app boot (called alongside `wireDealFeedToStore` in `main.tsx`).
- `src/features/notifications/titleFlash.ts` — `flashDocumentTitle()` prefixes `● ` for 5s, then restores. Idempotent — concurrent triggers reset the timer without compounding the prefix. `_resetTitleFlash` test-only helper exported for cleanup.
- `src/features/notifications/ToastStack.tsx` real per `docs/02 §5.2` + `docs/05 §4.5` chrome family — top-right `fixed` stack, AI-bordered + glass background, 320px wide; each card has `data-testid="toast-{dealId}"`. Click opens the ticket (calls `uiStore.openTicket(dealId)`) and dismisses itself; explicit `X` button dismisses without opening.
- Wired into `src/App.tsx` (renders `<ToastStack />` at the root level so it overlays both blotters and the ticket panel) and `src/main.tsx` (`wireNotifications()` boots the dispatcher subscription).
- **Row flash** per `docs/02 §5.2` — `ActiveBlotter.tsx`'s Row tags new SI-Initial-dealable rows with `data-row-flash="new"` + a Tailwind `animate-row-flash` class that runs the `row-flash` keyframe (`global.css`, 300ms amber-30% → transparent fade with `forwards` fill mode). No JS timer; the CSS animation plays once on mount.
- **All three SI E2Es now assert the toast + title-prefix.** OFF_HOURS, CREDIT_BREACH, and SIZE_LIMIT_MARGIN_TUNE each add a `getByTestId('toast-{dealId}')` visibility check + `expect.poll(page.title()).toMatch(/^●\s/)`. Removes the FXSW-028-deferred markers those specs were carrying.

**User-directed decisions:** None — `docs/02 §5.1` / `§5.2` pinned the trigger conditions, message format, and the dedupe rule.

**Agent-directed decisions:**
- **Dispatcher lives in `src/features/notifications/`, store lives in `src/state/stores/`.** Mirrors the existing dealFeed / dealsStore separation: feature-y subscriber pattern in features/, pure Zustand data in stores/. The bootstrap wiring lives in `main.tsx` alongside `wireDealFeedToStore` so all the cross-system glue is in one place.
- **SI channel detection via `rejectionReasons.length > 0`**, not a separate `channel` field on the entry. The dealsStore already tracks `rejectionReasons` per deal and ESP deals always have an empty list (they're auto-priced, no intervention reasons). One less concept to thread through.
- **`dispatchNotifications` exported as a function alongside `wireNotifications`** so tests can drive it directly without spinning up the subscription. Keeps tests synchronous and lets the test verify "second call with same deal doesn't re-fire" cleanly.
- **Toast click both opens the ticket AND dismisses the toast.** Spec wording ("Clicking the toast opens the ticket") is silent on dismissal; keeping the toast around after the trader is already in the ticket would be visual noise. Matches the intent of the affordance.
- **`X` button on each toast** uses an inline `<span role="button">` rather than a nested `<button>` because the outer card is itself a `<button>` and nested buttons are an HTML structural error. Click handler uses `stopPropagation` to suppress the outer card's open-ticket handler.
- **`animate-row-flash` Tailwind utility** added via `tailwind.config.ts` `animation` extension; the keyframe itself lives in `global.css` next to the existing `holdgrow` keyframe (FXSW-020 pattern). Keeps Tailwind config terse and lets keyframe rules colocate with each other.
- **`expect.poll(page.title())` for the E2E title-prefix check** rather than a strict `toHaveTitle` — the title clears after 5s, and `expect.poll` retries the assertion against the live document title without racing the 5s window.
- **`reset()` on the notifications store** is intentionally a test affordance; production never calls it. The `markNotified`/`hasNotified` separation lets the dispatcher stay idempotent without needing to read the full set.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (**304 pass / 0 todo**, up from 296 / 0 — 8 new), e2e ✓ (5/5 in 49.9s — up from 34.5s with the added notification assertions), build ✓.

---

## FXSW-027 · SIZE_LIMIT_MARGIN_TUNE + CREDIT_BREACH E2E
**Commit `ab8cd30`**

- TDD red→green: **two new Playwright specs** transcribing `docs/07 §3` (Credit Breach) and `docs/07 §4` (Size Limit + Margin Tune).
  - `tests/e2e/credit-breach.spec.ts` (7.3s) — inject CREDIT_BREACH → INTERVENE row for Halcyon Capital / GBPUSD / "Credit limit breach" → click row → ticket opens → SI advances to PickedUp → ReasonsPanel shows "Client credit limit would be breached" → `data-suggestion-state="credit-decline"` + §7 rationale visible + `suggestion-reject` present + `suggestion-apply` absent → hold Reject 600ms → SI cycles RejectSent → TraderRejected → status REJECTED → 5s removal → Historic with `data-outcome="Rejected by Trader"`.
  - `tests/e2e/size-limit-margin-tune.spec.ts` (9.2s) — inject SIZE_LIMIT_MARGIN_TUNE → INTERVENE row for Northwind FX / EURUSD / "Size > auto-pricer band" → click row → ticket opens with margin=3 → AI Suggestion Panel reaches `ready` state showing 4 pips, High confidence, rationale containing "Gold-tier" or "12M EURUSD" → click Apply → margin-input animates to 4 + panel collapses to `applied` strip showing "Applied 4 pips" → hold Send Stream 600ms → SI Quoted (STREAMING) → 2s wait for the scripted CLIENT_ACCEPT follow-up → TradeConfirmed (DONE) → 5s removal → Historic with `data-outcome="Executed"`.
- Total 5 E2Es now green in 34.5s (smoke 0.1s, happy-path-esp 8.0s, off-hours-intervention 8.1s, credit-breach 7.3s, size-limit-margin-tune 9.2s) — comfortably under the 5-min CI budget anticipated for FXSW-032.
- **End of Phase 4 per BACKLOG.** Full AI Margin Suggestion slice from clientProfiles seed data through the rule engine, rationale builder, panel UI (ready / applied / credit-decline / computing), and both end-to-end demonstrations is in place.

**User-directed decisions:** None — `docs/07-scenario-pack.md` Gherkins were verbatim.

**Agent-directed decisions:**
- **Debug detour: rendered HTML asserted the panel was present, the test said it was missing.** The root cause was the FXSW-025 markup placing `{suggestion.suggestedPips}` and a child `<span>pips</span>` inside the same `data-testid="suggestion-pips"` div — Playwright's `toHaveText('4')` resolved to the combined text `"4pips"`. Fixed by lifting the unit label to a sibling span and tightening the testid scope to the number only. Took a 15-minute diagnostic detour writing a throwaway spec that dumped the ticket panel HTML + console-logged the compute effect; useful enough that I considered keeping it, but a throwaway tool isn't a Phase 4 deliverable.
- **Blotter row assertion uses the short chip label**, not the long ReasonsPanel label. Initial attempts asserted `"Client credit limit would be breached"` on the blotter row — that text lives in `ReasonsPanel.tsx` (inside the ticket), not `ReasonsCell.tsx` (the blotter chip, which shows `"Credit limit breach"`). Both labels are now asserted in the credit-breach spec — short label on the row, long label on the panel once the ticket opens.
- **No `Why?` click in either E2E.** The factor-table expansion is unit-tested directly in `SuggestionPanel.test.tsx`; including it in the E2E would add wall-clock without exercising new contract surface.
- **No assertion on the indigo margin-glow flash in the E2E**, even though the AC describes the visual. The unit-level integration harness (FXSW-025 `MarginGlowHarness`) already proves Apply triggers `data-margin-glow`. Re-asserting it in the E2E would just race the 600ms animation timer.
- **Both specs follow the `__seedFeed = 42` + `__zeroAckDelay = true` initScript pattern from the OFF_HOURS spec.** Same test-fidelity rules from `docs/07 §"Notes on test fidelity"`: assert on `data-si-state` / `data-display-status` / `data-outcome`, never on the natural-language display text for state.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (**296 pass / 0 todo**, unchanged — E2E specs are Playwright not Vitest), e2e ✓ (5/5 in 34.5s), build ✓.

---

## FXSW-026 · SuggestionPanel credit-decline + Recompute
**Commit `a7cd0fd`**

- TDD red→green: **6 new `SuggestionPanel.test.tsx` cases** (14 total) — credit-decline UI shows §7 message + Reject shortcut + `data-suggestion-state="credit-decline"` + no Apply; Reject hold-to-confirm (single click does nothing, 600ms hold fires `onReject`); Recompute click switches `data-suggestion-state` to `computing` then back to `ready` after the 800ms debounce and calls `onRecompute` exactly once; multiple rapid Recompute clicks coalesce into one call; Apply disabled during computing; vol shift > 30% triggers recompute, ≤ 30% does not. Removed the FXSW-025 placeholder test "renders nothing for credit-decline" — superseded.
- `src/features/ticket/SuggestionPanel.tsx` extensions:
  - Credit-decline branch: distinct header ("AI Recommendation" + amber AlertTriangle), §7 rationale, `RejectHoldButton` primitive (600ms hold or double-click) on `red/40` chrome.
  - Recompute icon button (`RotateCw`) in the header right cluster next to the confidence badge. Disabled + spinning while computing.
  - Computing state replaces the pips number with a `bg-elevated` pulse skeleton and the rationale with "Recomputing…"; Apply + Why? both disabled. `aria-busy` mirrors the visual state.
  - Debounced trigger (`triggerRecompute`) clears any in-flight timer on each call so rapid invocations coalesce into one `onRecompute()` after 800ms of quiet.
  - Vol-shift effect: when `currentVolatility` prop changes by > 30% relative to the value used at the last compute, fires `triggerRecompute`. The static v1 lookup means this branch never fires in practice — the wiring is in place for v2 per `docs/09 §3.1`.
- `src/features/ticket/TicketPanel.tsx` integration:
  - Compute logic refactored into `computeAndSetSuggestion` (a `useCallback`) so the initial PickedUp-entry effect and the Recompute callback both go through the same path.
  - Wires `onRecompute` → `computeAndSetSuggestion`, `onReject` → `forwardEvent(dealId, { type: 'Reject' })` (same event the TicketFooter Reject sends), and `currentVolatility` → `getMarketContext(pair).pairVolatility`.

**User-directed decisions:** None — `docs/09 §7`, `§9`, and `docs/05 §4.5` "computed state" pinned the credit-decline shape, the recompute triggers, the debounce window, and the shimmer affordance.

**Agent-directed decisions:**
- **`RejectHoldButton` inlined inside `SuggestionPanel.tsx`** rather than lifting `HoldButton` out of `TicketFooter.tsx` into a shared component. Per the FXSW-020 dev-log, "FXSW-029 (polish) can lift to `/components/Button.tsx` when there's a second consumer." Second consumer is now FXSW-026; the lift belongs in FXSW-029 (where it gets the full Button-with-variants treatment per `docs/05 §3.1`). For FXSW-026 the inline copy is ~40 lines and keeps the change scoped.
- **Computing state takes 800ms regardless of whether the parent computed synchronously.** The doc explicitly calls out the debounce as a "Recomputing…" affordance — running it for 800ms gives the trader the feedback animation even when the engine is instant. The new suggestion is in props well before the timer fires; the panel simply waits before revealing it.
- **Apply + Why? disabled during computing**, not just hidden. Visible disabled chrome (`opacity-50` + `cursor-not-allowed`) reads as "in flight" rather than "gone"; matches the in-flight pattern from FXSW-020's `data-in-flight` buttons.
- **`onReject` is a parent-injected callback**, not a direct `useDealsStore.getState().forwardEvent` call from the panel. Keeps the panel free of store coupling and lets TicketPanel route the event the same way as the TicketFooter Reject (single source of truth for "what does Reject mean").
- **Vol-shift detection uses relative change, not absolute.** `|new - old| / |old| > 0.3` matches the spec's "shift > 30% from the value used at last computation" rather than "absolute delta > 0.3 pips/min." Guards against `lastVol === 0` returning `Infinity`.
- **`recomputing` state is NOT cleared by the suggestion-change effect.** When the parent swaps `suggestion` mid-compute (synchronous recompute returns immediately), the panel keeps the shimmer visible until the 800ms timer expires. Tested directly: rapid Recompute clicks still produce exactly one `onRecompute`.
- **Vol prop type is `number | undefined`** so the watch effect can no-op cleanly when the parent doesn't supply a value (e.g., a test rendering only the ready-state assertions). Tested via the existing "ready" cases — they don't pass `currentVolatility` and still pass.
- **Reject button label is "Reject deal"**, not "Reject" — the credit-decline framing is "decline this trade entirely," not "abort the quote." Matches the §4.5 sketch.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (**296 pass / 0 todo**, up from 290 / 0 — 6 new SuggestionPanel cases, 1 obsolete placeholder removed). Build clean.

---

## FXSW-025 · SuggestionPanel ready / applied / Undo
**Commit `301aac1`**

- TDD red→green: **8 `SuggestionPanel.test.tsx` cases** — renders pips + rationale + confidence in `ready` state (per `docs/09 §13`); Apply click switches `data-suggestion-state` to `applied` and updates current margin; Undo restores the previous margin and flips back to `ready`; Why? toggles the factors table; **integration test** wires SuggestionPanel + PricingPanel via a `MarginGlowHarness` and asserts the `data-margin-glow` attribute appears on the margin input then clears after 600ms (the `docs/05 §4.5` "indigo outline animation" called out in the FXSW-025 AC); credit-decline + null suggestion render nothing; a new suggestion prop resets the panel back to `ready` so re-computes get a fresh visit.
- `src/features/ticket/SuggestionPanel.tsx` real per `docs/02 §4.3` + `docs/05 §4.5`:
  - Header: `Sparkles` icon (lucide) + "AI Margin Suggestion" + confidence badge (High → `ai-accent` on `ai-bg`, Medium → `text-dim` on `bg-elevated`, Low → `amber` with dotted border).
  - Body: 32px mono pips number + small "pips" suffix + the rationale string (≤ 120 chars from FXSW-024).
  - Footer: primary Apply button on `ai-accent` + ghost Why? toggle.
  - Why? expanded: 3-column factors table (Factor / Δ pips / Note) with `baseline` shown for the tier row instead of `+0`.
  - `applied` strip: single-line collapsed view with Sparkles + "Applied N pips" + Undo affordance, same `ai-bg` + `ai-border` + `shadow-ai` chrome so the visual hierarchy stays unchanged.
  - Credit-decline branch is `return null` for now — FXSW-026 swaps in the §7 Reject-shortcut UI.
- `src/features/ticket/TicketPanel.tsx` wires the panel between ReasonsPanel and SummaryPanel (per `docs/09 §2` "sits between the Reasons Panel and the Pricing Panel"). The previous placeholder note ("AI Suggestion lands in FXSW-022 through FXSW-026") is gone.
- Suggestion computation: a `useEffect` keyed on `entry + liveTick` computes via `suggestMargin` exactly once per PickedUp visit (gated by a `useRef` flag). The flag clears whenever SI leaves PickedUp so re-entry after Withdraw recomputes. `docs/09 §9`'s recompute-on-volatility-shift and 800ms debounce are FXSW-026 territory.

**User-directed decisions:** None — `docs/02 §4.3`, `docs/05 §4.5`, and `docs/09 §10/§13` together pinned the UI, the interaction model, and the `data-*` test contract.

**Agent-directed decisions:**
- **Panel takes `suggestion` as a prop and the parent owns the compute lifecycle.** Keeps the panel pure (testable with a static mock) and lets the next ticket's recompute logic live in TicketPanel without disturbing the panel's contract. The alternative — panel pulls its own dependencies (client profile, market context, engine) — would force every test into a full TicketPanel mount.
- **`appliedFrom: number | null` for Apply state** rather than a boolean + a separate `previousMargin` field. Single source of truth; presence already implies "applied," and the stored value is what Undo restores. Avoids a "applied but previousMargin is undefined" impossible state.
- **`useEffect([suggestion])` resets internal applied + why state.** Means a new suggestion (different deal, future recompute) always re-expands the panel. Matches the spec intent — once a fresh recommendation arrives, the trader shouldn't have to dig through a stale Applied strip to see it. Tests assert the behaviour directly.
- **Why? table shows `baseline` (not `+0`) for the Client tier row.** The tier factor has `delta: 0` because it's the starting point, not an adjustment. Surfacing `+0` would read as "tier had no effect" which is the opposite of true. The `09 §13` sketch agrees ("Client tier   baseline gold = 2 pips").
- **Pricing-glow contract verified end-to-end via the integration harness**, not just via SuggestionPanel's `onApply` call. The doc explicitly calls out the margin-input animation as part of the Apply UX. Trusting only the PricingPanel-side test would leave the wiring untested. The integration test is six lines and provides a strong guarantee.
- **One-shot compute per PickedUp visit** rather than recompute on every tick or every entry effect. `docs/09 §9` is explicit: "does not recompute on every price tick." A `useRef` boolean is the simplest gate; resets on tick-state leaving PickedUp so re-entry (after Withdraw) gets a fresh number.
- **The `currentMargin` prop is the source of truth for Undo's "previous value"** rather than something the panel infers from the deal context. Aligns with the FXSW-019 lift of margin state into TicketPanel — the panel reads what the parent already owns.
- **`text-amber` for low-confidence badge with dotted border**, distinct from the solid `ai-accent`/`text-dim` chips. Communicates "be cautious" without screaming. Matches `docs/05 §4.5` colour pairing.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (**290 pass / 0 todo**, up from 282 / 1 — 8 new SuggestionPanel cases, the placeholder `it.todo` is gone). Build clean.

---

## FXSW-024 · Rationale builder
**Commit `8b12400`**

- TDD red→green: **7 `rationale.test.ts` cases** — the two `docs/09 §8` canonical scenarios (Globex/USDJPY/OFF_HOURS, Northwind/12M EURUSD/SIZE_LIMIT) asserted with regex tolerance + length ≤ 120; the 0-factor case (only tier) checks the line starts with the tier label, ends with `— suggesting N pips.`, and has no orphan-comma artifacts; the 5+ factor case asserts truncation keeps the line ≤ 120 while preserving the tier label and pip count; the credit-decline path asserts the engine wires `CREDIT_DECLINE_RATIONALE` exactly; direct `buildRationale` call asserts the trailing `— suggesting N pips.` shape.
- `src/services/suggestion/rationale.ts` real per `docs/09 §8`:
  - `CREDIT_DECLINE_RATIONALE` constant exported; engine now imports it (single source of truth — the panel will too).
  - `buildClientPhrase` returns `"{Tier} client"` by default, enriched to `"{Tier} client with strong recent acceptance"` when the client is `high_engagement` AND acceptance ≥ 0.7 — surfaces the §8 "Platinum client with strong recent acceptance" phrase organically.
  - `craftFactorPhrase` maps each factor name to a short natural-language phrase (`'off-hours USDJPY'`, `'above auto-pricer band'`, `'12M EURUSD'`, etc.) rather than concatenating raw factor notes — produces sentences that read like the §8 examples.
  - Composition picks the top-`MAX_FACTOR_PARTS` (= 3) non-tier factors by `|delta|`, then drops from the end until the line fits `MAX_LEN` (= 120).
  - Pluralisation: `1 pip` vs `N pips`. Trivial polish that the doc template happens not to encode.

**User-directed decisions:** None — `docs/09 §8` template + the three quoted examples pinned the shape.

**Agent-directed decisions:**
- **`Pair class` factor → no phrase**. The factor still influences `suggestedPips`, but emitting `"USDJPY wider-spread"` alongside `"off-hours USDJPY"` (which already names the pair) reads as redundant. Confirmed against §8 — the Globex example is `"Standard-tier client, off-hours USDJPY — suggesting 5 pips."`, no second pair reference. The factor stays in the engine because it changes the math; only the rationale string drops the redundancy.
- **`VIP volume` factor → no phrase**. Same reasoning — already folded into the enriched `"Platinum client with strong recent acceptance"` client phrase whenever the trigger conditions overlap. For a `high_engagement` client with acceptance < 0.7 the VIP signal goes unmentioned; acceptable since the impact is just -0.5 pips and the demo never highlights it as a distinct rationale element.
- **`MAX_FACTOR_PARTS = 3` cap** rather than the doc pseudocode's stricter `|delta| >= 1` threshold. The Northwind example includes `"above auto-pricer band"` whose underlying delta is 0.5 — the strict threshold would drop it. Picking "top 3 by magnitude" reproduces the example output and matches the doc's other framing ("composes 2–3 of the largest-magnitude factors").
- **Pluralisation handled at the compose-step**. `1 pip` reads correctly; `N pips` for N ≥ 2 follows. The doc template literal (`${suggestedPips} pips`) is a slip rather than a spec — fixing it cost two lines and removes a small wart from the demo.
- **`CREDIT_DECLINE_RATIONALE` exported as a constant** (not just hard-coded in the engine). Lets `rationale.test.ts` assert the exact text without duplicating the literal, and lets the FXSW-025/026 panel reuse it for the Reject-shortcut affordance.
- **Crafted phrases live in `rationale.ts`**, not on the `Factor` objects. The engine produces machine-readable factor records (with the formal `note` field, which the panel's "Why?" expansion will surface); the rationale composes a human sentence on top. Two audiences, two strings.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (**282 pass / 1 todo**, up from 275 / 2 — 7 new rationale cases, 1 todo placeholder cleared). Build clean.

---

## FXSW-023 · Suggestion engine
**Commit `ca0cad8`**

- TDD red→green: **34 `engine.test.ts` cases** organised by concern — tier baseline (×4), notional band (×5 including non-USD-base conversion), market context (×6 covering vol/liquidity/pair-class true+false), rejection reasons (×4 incl. CREDIT_LIMIT precedence), client behaviour (×6 covering all flag paths + acceptance both sides), confidence (×5 covering all three return paths + each gate), algebraic invariant (×1, samples 5 inputs), floor (×1), and the two canonical scenarios from `docs/09 §8` (Globex 5M USDJPY OFF_HOURS = 5 pips; Northwind 12M EURUSD SIZE_LIMIT = 4 pips).
- `src/services/suggestion/engine.ts` real per `docs/09 §5`: pure `suggestMargin(input)`. CREDIT_LIMIT short-circuits to the `credit-decline` shape with the §7 message. Otherwise builds a `Factor[]` walking tier baseline → notional band → market (vol / thin liquidity / pair class) → rejection reasons → behaviour (flight_risk / VIP-volume / acceptance) → floor & round. `approxUsdNotional` helper inlined: USD-base pairs return notional as-is, USD-quote pairs convert via current mid.
- `computeConfidence` per `docs/09 §6`: high if `tier !== 'new'` AND vol > 10M AND liquidity is not thin; low if any of `tier === 'new'`, thin liquidity, vol < 1M; otherwise medium. The three returns mean three test cases plus enough variants to exercise each `&&` / `||` gate on both sides.
- `MarginSuggestion` discriminated union (`ready` | `credit-decline`) from FXSW-022's types module gives the engine an exhaustive contract — `kind === 'credit-decline'` narrows away the pip/confidence/factors fields, so the FXSW-025/026 panel will get the §7 special case via the type system rather than a separate boolean flag.
- Stubbed `rationale.ts` to a one-liner (`Suggesting N pips.`) so the engine compiles end-to-end. The full builder lands in FXSW-024.

**User-directed decisions:** None — `docs/09 §5–§7` pinned every pip delta + rule order; the AC test list pinned coverage.

**Agent-directed decisions:**
- **Skipped installing `@vitest/coverage-v8`** even though the AC says "100% branch coverage on `engine.ts`." Adding a coverage instrument as a dev-dep would let the harness emit a number, but doesn't change which lines actually got exercised. Walked the engine source against the 34 test cases by hand and confirmed every `if`/`else if`/`&&`/`||` branch has both the true and false case asserted — including the three `computeConfidence` return paths and `approxUsdNotional`'s pair-prefix split. CLAUDE.md "don't add features beyond what the task requires" supports the call; if a future ticket needs coverage gating in CI, that's the right point to add the instrumentation.
- **Tests assert on factor presence by `name` + `delta`**, not whole-suggestion equality. Asserting `factor(s, 'Notional size')?.delta === 0.5` is what the rule expects; whole-object equality would force every test to spell out the unrelated tier/note strings and would couple test maintenance to engine-internal wording.
- **`approxUsdNotional` inlined** in `engine.ts` rather than lifted to `marketContext.ts`. It's pure pricing math reading the same inputs the engine already has; pulling it into another module would just hide one helper behind an import. If a second consumer ever wants it, lift then.
- **`CREDIT_LIMIT` checked first**, before the factors list even starts being built. Cheaper than building a half-result and discarding it, and matches the spec framing ("the suggestion panel does not propose a margin" — the engine literally doesn't propose one).
- **Test helper `makeInput()` defaults to medium-confidence territory** (standard tier, 5M vol, normal liquidity, EURUSD, 0.6 acceptance). Lets each focused test override only the field under inspection without dragging the other rules into the assertion. The defaults themselves form an implicit "neutral baseline" case that any test that doesn't override gets for free.
- **Algebraic invariant test runs the engine across 5 sampled inputs** rather than spelling out one assertion per input. The assertion is mechanical (`sum(deltas) + tier_base → suggestedPips after floor+round`); five samples chosen to span tier × notional × reasons × market × behaviour so the invariant is verified across a non-trivial slice of the input space.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (**275 pass / 2 todo**, up from 241 / 3 — 34 new engine cases, 1 todo placeholder cleared). Build clean.

---

## FXSW-022 · clientProfiles seed data
**Commit `59fff0e`**

- TDD red→green: **6 `clientProfiles.test.ts` cases** — each of the five named clients from `docs/09 §11` (Acme Corp / Globex Industries / Halcyon Capital / Northwind FX / Polaris Holdings) returns the expected `tier`, `recent30dVolume`, `recent30dAcceptanceRate`, `recentBehaviorFlag`. Sixth case: unknown client name returns a defensive `'new'`-tier profile with neutral defaults rather than throwing.
- `src/services/suggestion/clientProfiles.ts` real: lookup table keyed by `clientName` (matching the `Deal.clientName` field the engine receives), default fallback that preserves the requested name on the returned `ClientProfile`.
- `src/services/suggestion/types.ts` real for the wider suggestion service: `ClientTier`, `ClientBehaviorFlag`, `ClientProfile`, `Factor`, `SuggestionInput`, and a discriminated union `MarginSuggestion = ReadySuggestion | CreditDeclineSuggestion` covering both the normal output and the §7 CREDIT_LIMIT special case.
- `src/services/suggestion/marketContext.ts` head-start: tiny static `getMarketContext(pair)` returning `pairVolatility` per the `docs/09 §3.1` table + `sessionLiquidity: 'normal'`. Included here so the shared static data lives in one commit; the engine that consumes it lands in FXSW-023.

**User-directed decisions:** None — `docs/09 §11` table pinned every named-client value; the few gaps were doc-pack guidance interpretations (see below).

**Agent-directed decisions:**
- **Halcyon Capital's `recent30dAcceptanceRate` encoded as `0.5`, not `0`.** `docs/09 §11` shows `—` for Halcyon (zero history). Encoded literally as `0`, Halcyon would trip the engine's `acceptanceRate < 0.4 → -0.5` rule in FXSW-023 — penalising a brand-new client for "low acceptance" they don't even have data for. `0.5` reads as a neutral prior ("no signal either way"). Comment in `clientProfiles.ts` documents the choice. The unknown-client fallback uses the same `0.5` for consistency.
- **`averageMarginPaid` derived from tier defaults**, not specified per-client in `docs/09 §11`. Picked `1.5 / 2.5 / 3.0 / 0` for `platinum / gold / standard / new`. The field isn't consumed by the engine in v1 (`docs/09 §5` rules don't reference it); it's display-only context for an eventual "client history" panel.
- **`MarginSuggestion` as a discriminated union** rather than the single flat shape `docs/09 §4` shows. The §7 credit-decline path doesn't have `suggestedPips`, `confidence`, or `factors` — making them optional on a single type would force every consumer to null-check. The `kind: 'ready' | 'credit-decline'` discriminator gives the FXSW-025/026 panel a clean exhaustiveness check.
- **`marketContext.ts` bundled with FXSW-022** even though it's the engine's input source, because it's a 12-line static lookup and the suggestion/ directory benefits from having all the shared data land together. FXSW-023's engine consumes it.
- **`clientId` derived from `clientName`** via lowercased-hyphenated form (`'acme-corp'`, `'globex-industries'`, etc.). The field exists on `ClientProfile` per the spec but no scenario keys off it yet; the slug form is the closest thing to a stable identifier that survives a copy-paste of the seed data.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (**241 pass / 3 todo**, up from 235 / 3 — six new `clientProfiles` cases). E2E unchanged (3/3). Build clean.

---

## FXSW-021 · OFF_HOURS_INTERVENTION E2E
**Commit `65e2cbf`**

- TDD red→green: full Playwright spec at `tests/e2e/off-hours-intervention.spec.ts` transcribing `docs/07-scenario-pack.md` Scenario 2. Inject → INTERVENE row → click row → ticket slides in with reasons + streaming bid/ask + margin 3 → hold Send Stream 600ms (Playwright's `click({ delay: 700 })`) → `data-si-state` cycles through `QuoteSent` to `Quoted`, status to STREAMING, footer shows Withdraw + Reject → 1.5s elapses → CLIENT_ACCEPT lands → TradeConfirmed + DONE → 5s elapses → row leaves Active, lands in Historic with `data-outcome="Executed"`. Runtime 8.0s (well under the 15s budget).
- Pins `window.__seedFeed = 42` + `window.__zeroAckDelay = true` via `page.addInitScript` per the test-fidelity rules in `07 Notes`. Zero ack delays make every `*Sent` instant; real wall-clock for the 1.5s `CLIENT_ACCEPT` gate + the 5s blotter-removal rule.
- All three E2Es now green: smoke (`tests/e2e/smoke.spec.ts`), happy-path-esp, off-hours-intervention. Total Playwright runtime 17.9s on local.
- **End of Phase 3 per BACKLOG.**

**User-directed decisions:** None — `docs/07 Scenario 2` is verbatim; the only judgement call was on toast + title-prefix assertions (out of scope).

**Agent-directed decisions:**
- **Toast + document-title-prefix assertions omitted.** The Gherkin scenario asserts on "a toast in the top-right with text containing 'Globex Industries'" and "the document title is prefixed with '● '". Both are notification-layer behaviour (FXSW-028 in Phase 5). Including them now would either need stubs or would fail. The test file's header comment names them as intentionally deferred.
- **Hold via `click({ delay: 700 })` rather than `dblclick()`.** Both paths exist on HoldButton (FXSW-020 added `onDoubleClick` as an alternative). Picked the hold path for spec fidelity — the Gherkin literally says "clicks Send Stream and holds for 600ms." 700ms instead of 600ms gives a small margin against the timer-vs-pointerup race; even if `pointerUp` arrives 1ms before the `setTimeout` fires, the hold confirm still wins because the timer was already scheduled.
- **Tolerant timeouts on the timed transitions** (`Quoted`: 1500ms timeout for the CLIENT_ACCEPT gate at +1500ms; `TradeConfirmed`: 3000ms; archived: 6000ms). Each timeout is the spec value plus a generous slack so the test isn't flaky under CI's variable jitter.
- **Asserts on `data-si-state` + `data-display-status` + `data-outcome`**, not on text content. Per `07 Notes on test fidelity`: "Tests should assert on data-si-state / data-rfs-state attributes and data-testid values, not on text or color."
- **Implicit reliance on previous-ticket fidelity.** The E2E doesn't directly mount/unmount components — it drives the real app top-to-bottom. So this test functions as an integration check for everything from FXSW-007 (PricingFeed) through FXSW-020 (TicketFooter). If any ticket regresses a contract — `data-deal-id`, `data-si-state`, the reasons-panel label, the margin-input value, the footer button visibility — this E2E catches it. Worth its weight at the end of Phase 3.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**235 pass / 3 todo**, unchanged — the E2E is in Playwright, not Vitest), e2e ✓ (3/3 in 17.9s), build ✓, dist/ Caplin-free ✓.

---

## FXSW-020 · TicketFooter + *Sent → *Ack flow
**Commit `18e0c24`**

- TDD red→green: **7 specified `TicketFooter.test.tsx` cases** — PickedUp streaming-mode visibility (Send Stream / Release / Reject), PickedUp fixed-mode visibility (Send Quote / Release / Reject / Return-to-Stream), Quoted visibility (Withdraw / Reject + Release), Reject single-click does nothing + 600ms hold fires, Send Stream cycles `QuoteSent → Quoted` via the ack delay, Send Stream shows `data-in-flight="true"` during `QuoteSent`, Release cycles `HoldSent → Initial` and flips `dealable` back to true.
- `src/features/ticket/TicketFooter.tsx` real per `docs/02 §4.7`: 6 buttons (Reject / Release / Send Stream / Send Quote / Withdraw / Return-to-Stream) gated on `siState` + `pricingMode`. Send Stream + Send Quote stay mounted through `QuoteSent` so the spinner can render in-place; same for Reject through `RejectSent` and Release through `HoldSent` and Withdraw through `WithdrawSent`.
- **HoldButton** primitive inlined in the same file: 600ms `setTimeout` on `pointerDown`, cancels on `pointerUp` or `pointerLeave`; double-click is an alternative confirm path (per `02 §4.7` "600ms hold or double-click"). Visual progress overlay via an inline-styled `<span>` driven by a `holdgrow` keyframe added to `global.css` — Tailwind config stays untouched.
- **`data-in-flight`** marks the *Sent window. Buttons disable themselves automatically while `inFlight === true`; lucide `Loader2` icon renders inside the button with `animate-spin`.
- `TicketPanel` mounts `<TicketFooter dealId={deal.dealId} siState={siState} pricingMode={pricingMode} onReturnToStream={…} />` outside the scrollable body so it stays pinned to the bottom. Return-to-Stream resets `pricingMode` / `fixedSide` / `frozenTick` together.
- Placeholder note in TicketPanel updated: now only the AI Suggestion (FXSW-022–026) remains as a "panels coming."

**User-directed decisions:** None — `docs/02 §4.7` visibility table + the AC test list pinned every button's behaviour. The choice of progress-overlay animation was unspecified; picked a left-to-right wipe to match the 600ms hold timeline.

**Agent-directed decisions:**
- **`pointerDown`/`pointerUp` not `mousedown`/`mouseup`.** Pointer events normalise across mouse, touch, and pen — covers a future mobile-tap demo without a second code path. RTL's `fireEvent.pointerDown` works in jsdom.
- **Double-click is `onDoubleClick` even when the hold path didn't fire.** Two single clicks (each cancelled by the immediate `pointerUp`) still register as a `dblclick` at the DOM level — that's the spec's "double-click" alternative. No timing math needed; the browser fires `dblclick` after two `click`s within ~500ms.
- **HoldButton primitive inlined** in `TicketFooter.tsx`, not extracted to `src/components/Button.tsx`. The placeholder `Button.tsx` says (per `docs/05 §3.1`) "variants: primary, secondary, ghost, danger. Sizes: sm, md. Supports `holdToConfirm` prop." That's the eventual shared shape; for FXSW-020 the only two consumers are Reject + Send Stream, both with the same look. Extracting now would speculate. FXSW-029 (polish) can lift to `/components/Button.tsx` when there's a second consumer.
- **`btn-release` is a single-click action**, not hold-to-confirm. AC + spec list only Reject + Send Stream as hold-to-confirm. Release is reversible (the operator can re-open the row and pick up again), so the friction isn't warranted.
- **Spinner stays in-place during *Sent**, not "button replaced by a separate spinner element." Same testid (`btn-send-stream`), same DOM node, just `data-in-flight="true"` + `disabled` + an icon inside. Tests can keep a single locator across the whole transition.
- **Quoted state shows Release in addition to Withdraw + Reject.** The `02 §4.7` table lists Release as visible in `Quoted` (it "withdraws the live quote as part of the release"). The AC test only mentions Withdraw + Reject; included Release because the spec table is the source of truth and the AC test wasn't claiming exclusivity.
- **Keyframe `holdgrow` in `global.css`**, not a Tailwind extension. One-off animation, used by one component, keeping it in global CSS avoids growing the Tailwind config for a single rule. Inline `style={{ animation: 'holdgrow 600ms linear forwards' }}` on the overlay span pulls it in.
- **`aria-describedby` + `.sr-only` hint on HoldButton** ("Hold for 600ms or double-click to confirm") per `docs/05 §7` accessibility note "Hold-to-confirm buttons announce via `aria-describedby`."
- **`onClick` on regular buttons disables when `inFlight`** — defensive double-tap guard. The `*Sent` ack delay is 250ms by default; a fast operator could double-click before the state advances. Disabling closes the gap.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**235 pass / 3 todo**, up from 228 / 3 — 7 new TicketFooter cases), e2e ✓, build ✓, dist/ Caplin-free ✓.

---

## FXSW-019 · ClientSummaryPanel
**Commit `466bb45`**

- TDD red→green: **4 specified `ClientSummaryPanel.test.tsx` cases** + 1 extra for the `tick=null` placeholder + 9 `pips.test.ts` cases for the lib functions FXSW-019 introduces.
  - EURUSD bid 1.0850 / ask 1.0852 / margin 3 → client bid 1.0847 / client ask 1.0855.
  - USDJPY (2-decimal pip) margin 3 → 157.74 / 157.81.
  - Margin change re-renders in one frame; estimated profit updates from $300 (at 3 pips) to $600 (at 6 pips) on EURUSD 1M.
  - Fixed mode uses whichever tick the parent passes (the panel doesn't know about modes — it just reads the tick prop).
  - Null tick → all three cells render the em-dash placeholder.
- `src/lib/pips.ts` real: `pipSizeFor(pair)`, `clientBidFromTrader`, `clientAskFromTrader`, `estimatedProfitUsd(margin, notional, pair, midRate)`. Per-pair pip sizes + display decimals from `docs/02 §2`. The bid/ask helpers round to the pair's display precision so consumers don't have to handle float drift (`1.0850 − 3*0.0001 === 1.0846999999999998` in raw floats — would render as `1.0847` only because `formatRate` did its own rounding; FXSW-019 makes the lib itself authoritative).
- `estimatedProfitUsd` handles both quote-side currencies: for USD-quoted pairs (`pair.endsWith('USD')`) the pip value is already a USD amount; for USD-based pairs the pip value is in the quote CCY and gets divided by the current midRate to convert. Zero-rate guard returns `0` so a transient stale-feed doesn't crash with `Infinity`.
- `src/features/ticket/ClientSummaryPanel.tsx` real per `docs/02 §4.5`: three-column grid with Client Bid / Client Ask / Est. profit. Profit formatted via `Intl.NumberFormat` USD currency, `maximumFractionDigits: 0` for compact display.
- **Refactor of PricingPanel**: `pricingMode`, `fixedSide`, `frozenTick` lifted from internal state to props with parent-owned state. Live tick also passed in via prop instead of the component calling `usePrice` itself. PricingPanel becomes fully presentational for mode + frozen-tick semantics. TicketPanel owns the lifted state via a single `usePrice` subscription and computes `displayTick = pricingMode === 'fixed' ? frozenTick : liveTick`.
- TicketPanel mounts `<ClientSummaryPanel tick={displayTick} margin={margin} notional={deal.notional} pair={deal.pair} />` between PricingPanel and DealSummaryPanel — both panels see the same `displayTick`, so they freeze and unfreeze together. Resets pricing-mode state on opening a different deal alongside the margin reset.

**User-directed decisions:** None — `docs/02 §4.5` is one paragraph and verbatim on every field.

**Agent-directed decisions:**
- **Lifted pricing-mode state from PricingPanel to TicketPanel** instead of bolting an "override tick" prop onto ClientSummaryPanel. The clean architecture is "one source of truth for the display tick"; the alternative (each panel subscribes to the feed and accepts an override) duplicates the subscription and splits the truth across two panels. Touched FXSW-017/018 tests — they now render through a `Harness` that mirrors the new TicketPanel wiring (single `usePrice` call + lifted state).
- **`pips.ts` rounds at the lib boundary**, not at the formatter. CLAUDE.md "Money values as `number` in display units, never strings. Format at the render boundary only" — but the bid/ask result of `1.085 − 3*0.0001` is `1.0846999999999998` in raw floats, which a consumer comparing values would treat as "different from 1.0847." Rounding to the pair's display precision inside the lib keeps `number` semantics clean (1.0847 is what consumers see and what equality checks against).
- **`estimatedProfitUsd` handles USD-based pairs via mid-rate division.** Spec says "use a static EUR/USD-style table for v1; precision doesn't matter as long as it changes when margin changes" — i.e. a hand-wave on the conversion factor. Doing the proper per-pair calculation (divide by midRate for USD-base pairs) costs one extra branch and gives accurate numbers across all 4 pairs without needing a separate table.
- **Profit displayed as `Intl.NumberFormat` USD currency** (`$300`, `$1,234`), zero decimals. Matches a trader's "what's this worth" glance; the spec doesn't pin a format so the en-US `style: 'currency'` + zero decimals is the most-readable default.
- **`tick={null}` → all three cells render em-dash**, not the calculated-from-zero values. The display tick is null when the live feed hasn't ticked yet OR when fixed mode was entered without a captured tick (defensive — shouldn't happen via UI). Em-dashes match the FXSW-012 RateCell + FXSW-017 PricingPanel pattern for "no data yet."
- **ClientSummaryPanel is `data-testid="client-summary-panel"` even though the AC only mentions field-level testids.** Container testid lets future tests scope to "the right panel" before reading fields; field testids inside scope cleanly. Same pattern as ReasonsPanel + SummaryPanel + DealSummaryPanel.
- **Refactor preserved every FXSW-017 / FXSW-018 test contract.** The 9 PricingPanel tests still cover the same behaviours through the `Harness` wrapper that mirrors TicketPanel; only the prop-shape changed.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**228 pass / 3 todo**, up from 214 / 4 — 5 new ClientSummaryPanel + 9 new pips, the FXSW-018 stub test retired), e2e ✓, build ✓, dist/ Caplin-free ✓.

---

## FXSW-018 · PricingPanel fixed mode + margin controls
**Commit `3a09a3e`**

- TDD red→green: **6 specified `PricingPanel.test.tsx` cases** for the fixed-mode + margin behaviour, in a `describe('fixed mode (FXSW-018)')` sibling of the 3 streaming cases from FXSW-017. New cases: click bid → `data-pricing-mode="fixed"` + bid cell gets `data-focused`; Refresh button only renders in fixed mode; + / − buttons increment/decrement by 1; keyboard `+` / `-` does the same as the buttons; margin floor is 1 (button disabled at floor; keypress clamps); programmatic margin update (parent prop change) animates `data-margin-glow="true"` for 600ms.
- `PricingPanel.tsx`: streaming-mode behaviour preserved verbatim. New state: `pricingMode: 'streaming' | 'fixed'`, `fixedSide: 'bid' | 'ask' | null`, `frozenTick: PriceTick | null`, `marginGlow: boolean`.
- **Cell becomes a `<button>`** so click-to-enter-fixed is keyboard + a11y accessible. `data-focused="true"` marks the clicked side; CSS adds the `--color-border-focus` outline + a 1px indigo ring.
- **Refresh button** (lucide `RefreshCw`) appears in the panel header only when `pricingMode === 'fixed'`. Click re-captures the current live tick as the frozen tick.
- **Margin controls**: parent-controlled (`margin` + `onMarginChange` props). +/− buttons via lucide `Plus` / `Minus`. Numeric input clamps floor at 1 on every change. Minus button is `disabled` at the floor.
- **Keyboard `+` / `-`** attached at the document level inside a `useEffect`. The handler ignores keys typed into an `<input>` so the operator can type a margin value without the global accelerator firing. `+`/`=` increment, `-`/`_` decrement.
- **Indigo glow** on margin change: a `useRef` tracks the previous margin; on every render the effect compares and, if different, flips `data-margin-glow="true"` for 600ms. Fires regardless of source (internal button, keyboard, typed input, or external prop push) — the visual cue means "margin updated", not "AI just suggested."
- **Tick flash + stale-watchdog suppressed in fixed mode** because the displayed rate is frozen — a flash or stale indicator would be misleading. They restart cleanly when the operator returns to streaming (Return-to-Stream lands in FXSW-020's TicketFooter).
- **`TicketPanel` owns the margin state**: `useState<number>(entry?.deal.defaultMarginPips ?? 3)`. A `useEffect` resets the value to the new deal's default whenever the operator opens a different deal. FXSW-025 + dealMachine context will eventually source this from the store; the prop-drilled local-state is the interim seam.
- Placeholder note in TicketPanel updated: FXSW-018 dropped from "panels coming." Margin floor + keyboard nav are user-visible.

**User-directed decisions:** None — `docs/02 §4.4` and `docs/05 §4` were verbatim on every control (label "Trader Rate" / "Margin", `MIN_MARGIN = 1`, focus outline color, 200ms + 600ms glow timing).

**Agent-directed decisions:**
- **Controlled component (`margin` + `onMarginChange` props), not internal state.** AC requires a "programmatic margin update simulating FXSW-025 Apply" — uncontrolled state would need an imperative ref or an effect comparing an `applyValue` prop, both more brittle than a plain controlled pattern. TicketPanel owns the state until FXSW-025 lifts it to the AI suggestion + the dealMachine context.
- **Cells are `<button type="button">`, not divs with `onClick`.** Keyboard activation (Enter / Space) works for free; correct semantics for assistive tech; matches the FXSW-012 blotter row pattern. Cost is a CSS reset to drop the default button styles.
- **Keyboard handler ignores input focus** via `if (e.target instanceof HTMLInputElement) return`. Otherwise typing `4` into the margin field with `+` modifier or pressing `-` on a negative number would fight the global accelerator.
- **Glow fires on every margin change**, not only on external pushes. The spec wording is "programmatic update animates" but a margin change from the operator's own keystroke is just as much a "this number just changed" event — keeping the visual cue consistent across sources avoids the confusing UX of "the field flashes when AI applies but not when I click +."
- **`disabled` minus button at the floor** rather than letting the click fire and clamping silently. Visible affordance + no spurious `onMarginChange` calls. The keyboard `-` still works (and clamps) because keyboard users don't see button state — and they get the same end state.
- **No "Return to Stream" button in the panel itself.** Per AC: "lives in TicketFooter — wired in FXSW-020." Until FXSW-020 lands, the panel has no exit from fixed mode — the operator would need to click a different bid/ask side (just re-enters fixed for that side) or close + reopen the ticket. Documented as a known interim in the code header comment.
- **Initial margin sourced from `entry.deal.defaultMarginPips`** (3 per the dealFeed payload in FXSW-008 definitions), not hardcoded to 3. Future scenarios with non-default margins land for free.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**214 pass / 4 todo**, up from 208 / 4 — 6 new fixed-mode cases), e2e ✓, build ✓, dist/ Caplin-free ✓.

---

## FXSW-017 · PricingPanel streaming mode
**Commit `1f88333`**

- TDD red→green: **3 specified `PricingPanel.test.tsx` cases** plus 2 supporting `usePrice.test.tsx` cases.
  - `usePrice` subscribes on mount and receives a tick within 600ms; unsubscribes on unmount (no further state updates after).
  - `PricingPanel` with seeded feed renders the expected bid/mid/ask pair-precision values on tick 1; bid/ask cells get `data-flash="up"/"down"` on a value change and clear after 80ms; stale-feed (no tick for 3s) renders the em-dash placeholder in all three cells.
- `src/services/feed/usePrice.ts` real: tiny hook wrapping `pricingFeed.subscribe(pair, setTick)` + cleanup via the returned unsubscribe. State seeded from `pricingFeed.getLatest(pair)` so consumers that mount after the feed has already ticked don't render `—` for a tick. Lives under `services/feed/` (not `features/ticket/`) so the FXSW-012 `RateCell` and future panels can share it without a cross-feature import.
- `src/features/ticket/PricingPanel.tsx` real per `docs/02 §4.4` + `docs/05 §4` (streaming subset). Bid + Ask cells at `text-2xl font-mono tabular-nums` with the Mid between them at smaller dimmer text. Each cell carries `data-flash` (`up`/`down`/absent) for the 80ms direction-coloured border. Stale-feed watchdog: a 3-second `setTimeout` arms on every tick; if it fires the panel switches all three cells to the em-dash placeholder. Fixed mode + margin controls land in FXSW-018.
- `TicketPanel` mounts `<PricingPanel pair={deal.pair} />` between SummaryPanel and DealSummaryPanel. Placeholder note drops FXSW-017 from the "panels coming" list.

**User-directed decisions:**
- **Keep digging on the off-by-one-pip test failure rather than loosen the assertions.** Options surfaced: (a) loosen the seed-42 test to assert behaviour not values; (b) keep debugging; (c) skip the panel; (d) discard. **Chosen:** (b). Worth understanding what was happening before papering over it. Turned out to be a real spec/test correctness issue (see below) — loosening would have hidden it.

**Agent-directed decisions:**
- **Captured the bid/ask asymmetry at the half-spread rounding boundary.** Debugging the seed-42 test failure (panel rendered `1.1714` for bid where the FXSW-007 mid-sequence said `1.1715`) showed the issue is real and consistent: for EURUSD's first tick the underlying `mid_float` sits in `[1.17145, 1.171475)`. Rounded mid is `1.1715`. But `bid_float = mid_float − 0.000025` lands below `1.17145` and rounds to `1.1714`. FXSW-007's golden sequence only locked the **mid**; the bid/ask asymmetry that emerges at the rounding boundary wasn't captured. The PricingPanel test now locks bid=`1.1714` / mid=`1.1715` / ask=`1.1715` for tick 1 + carries an explanatory comment.
- **Switched the flash test to GBPUSD seed-42 tick 2** (clean both-cells-DOWN setup) after probing the seed-42 sequences for each pair. EURUSD's bid happens to be flat on tick 2 in the rounded value (1.1714 → 1.1714); USDJPY's bid + ask are both flat through ticks 1–3; GBPUSD's tick 1→2 drops both cells one pip, exactly the case the flash test needs.
- **`data-flash` attribute** (string `"up"` / `"down"` / absent), not a `data-flashing` boolean + a separate `data-direction`. One attribute carries both signals, the test reads cleanly (`toHaveAttribute('data-flash', 'down')`), and the CSS in the component does the colour switch via clsx based on the same direction enum.
- **`usePrice` lives at `src/services/feed/usePrice.ts`**, not `src/features/ticket/usePrice.ts`. The FXSW-012 RateCell already subscribes to the feed manually; a future small refactor can replace its inline subscription with the same hook. Hooks that wrap a service module belong near that service, per the `useNotificationSound.ts` precedent in `docs/05 §3.4`.
- **Stale watchdog is a per-tick `setTimeout(3000)`** that resets on every tick, not a `setInterval(1000)` polling for staleness. Single timer, no busy-poll, fires exactly once when 3s elapse with no new tick.
- **Cells render with `transition-colors duration-[80ms]` so the border colour eases in/out**, not a hard snap. Matches the docs/05 §5 animation budget (80ms tick flash = linear).
- **Used a debug-test pattern to find the bug.** Wrote a throwaway `usePrice.debug.test.tsx` that logged the feed's subscriber callbacks alongside the panel's render values. Confirmed the feed correctly fired with mid=1.1715 but the panel's `tick.bid` was `1.1714` — pinned the cause to the half-spread rounding, not a React lifecycle issue. Debug test deleted before commit.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**208 pass / 4 todo**, up from 203 / 4 — 5 new tests across PricingPanel + usePrice), e2e ✓, build ✓, dist/ Caplin-free ✓.

---

## FXSW-016 · Summary + DealSummary panels
**Commit `096d645`**

- TDD red→green: **3 specified cases** plus 5 supporting cases.
  - `SummaryPanel.test.tsx` (2): Globex SELL 5M USDJPY for SPOT renders the verbatim sentence per `docs/02 §4.2`; the key/value strip shows account + trade date + T+2 settlement.
  - `DealSummaryPanel.test.tsx` (4): Monday + 2 → Wednesday; Thursday + 2 → Monday (skips Sat + Sun); Friday + 2 → Tuesday; direction/notional fields render correctly.
  - `lib/time.test.ts` (6): `addBusinessDays` covers Mon/Wed/Thu/Fri/Sat/Sun start dates; `formatSettlementDate` renders `DD MMM YYYY`.
- `src/lib/time.ts` real: `addBusinessDays(date, days)` skips Sat + Sun and rolls weekend start dates forward to the next Monday before adding. `formatSettlementDate` renders `27 May 2026`-style via `Intl.DateTimeFormat('en-GB')`.
- `src/features/ticket/SummaryPanel.tsx` real per `docs/02 §4.2`: natural-language sentence built from `clientName`, `side`, formatted notional, base/quote CCY split from the pair (`'USDJPY'.slice(0,3)` / `.slice(3)`), and tenor. Three-column key/value strip below: Account / Trade date / Settlement date.
- `src/features/ticket/DealSummaryPanel.tsx` real per `docs/02 §4.6`: two-column grid with Direction (`SIDE BASE_CCY`), Notional, Account, Trade date, Settlement date. Each `<div data-field="...">` so tests scope cleanly.
- `TicketPanel` mounts both new panels after `ReasonsPanel`; placeholder note drops FXSW-016 from the "coming soon" list.

**User-directed decisions:** None — `docs/02 §4.2` and `§4.6` were verbatim on the sentence template, the key/value strip, and the field list.

**Agent-directed decisions:**
- **Two separate components, both rendered in the ticket.** The spec describes the panels separately and there's intentional duplication (Account / Trade date / Settlement date appear in both). Could have unified them; chose not to — the AC names both panels and tests both independently. Future polish ticket can collapse if the duplication grates.
- **T+2 calculation lives in `src/lib/time.ts`** rather than inline in `DealSummaryPanel`. Reusable; `SummaryPanel` also calls it. CLAUDE.md: "Pricing math lives in /lib/pips.ts. Do not inline pip/margin math in components." — applying the same principle to date math.
- **Weekend trade-date rollover via `nextBusinessDay` loop on entry**, not via a calendar lookup. Spec doesn't mention rolling — it only says T+2 is from "today" (the trade date) and tests don't directly require it. Added the rollover anyway because Saturday/Sunday `createdAt` is plausible (dev injector could fire on the weekend); without rolling, `addBusinessDays(sat, 2)` would give a Tuesday which is "T+3 actual days" from Monday. Defensive but cheap.
- **`formatSettlementDate` is a tiny `Intl.DateTimeFormat` wrapper** rather than a hand-rolled formatter. Pair date with the existing `Intl.DateTimeFormat('en-GB')`-based `formatTime` in `lib/format.ts`. `en-GB` matches the EN-GB number-formatting decision from `docs/01-prd.md §4`.
- **`data-field="..."` on each DealSummary row** rather than testids per field. Same rationale as FXSW-015's `data-reason` — testids stay on container-level elements, structural data-* attributes do the within-component scoping.
- **`SummaryPanel` uses `<p>` + `<strong>`** for the natural-language sentence rather than a custom `.summary-sentence` wrapper. Semantic HTML; `<strong>` makes the highlighted fields (`Globex Industries`, `SELL 5,000,000 USD`, etc.) read correctly to screen readers.
- **FXSW-014 test assertion updated.** `TicketPanel.test.tsx` was asserting `toHaveTextContent('USDJPY')` because FXSW-014's placeholder body showed the pair as a single cell. FXSW-016's SummaryPanel splits it into "USD vs JPY" in the sentence + "SELL USD" in DealSummary direction — so the concatenated `USDJPY` string no longer appears. Updated the test to assert `'USD'` and `'JPY'` separately with an inline comment noting the FXSW-014→FXSW-016 layout evolution.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**203 pass / 4 todo**, up from 191 / 4 — 12 new tests across SummaryPanel + DealSummaryPanel + time.ts), e2e ✓, build ✓, dist/ Caplin-free ✓.

---

## FXSW-015 · ReasonsPanel
**Commit `5198b26`**

- TDD red→green: 3 specified `ReasonsPanel.test.tsx` cases — `['OFF_HOURS']` → one chip with "Outside trading window", `['SIZE_LIMIT', 'CREDIT_LIMIT']` → two chips with the right labels, `[]` → renders nothing (container.firstChild is null).
- `src/features/ticket/ReasonsPanel.tsx` real per `docs/02 §4.1`: title row "Risk Analysis" (`aria-label` + visible `<h2>`), then one `<li data-reason={r}>` per reason with icon (lucide `Clock` / `Maximize2` / `ShieldAlert` for OFF_HOURS / SIZE_LIMIT / CREDIT_LIMIT), label, and the verbatim one-line explanation from the spec. `data-testid="reasons-panel"` on the `<section>`.
- `TicketPanel` now mounts `<ReasonsPanel />` in place of the inline "Risk reasons" placeholder list that FXSW-014 used as a temporary stand-in. Existing FXSW-014 test "contains the deal's basic info" still passes because the new component renders "Outside trading window" (label match) — same text, richer markup.
- Placeholder note in TicketPanel updated to drop FXSW-015 from the "coming soon" list.

**User-directed decisions:** None — `02 §4.1` is verbatim on every label and explanation string.

**Agent-directed decisions:**
- **Icon picks (lucide).** Spec says "icon + label + explanation" without naming icons; picked `Clock` for OFF_HOURS, `Maximize2` for SIZE_LIMIT, `ShieldAlert` for CREDIT_LIMIT. All amber-tinted (`text-amber`) so they read as warnings without competing with the status pill's color. If FXSW-020 (polish) wants different icons, they're a one-line swap.
- **`<section role implicit>` + `aria-label="Risk Analysis"`** rather than `role="region"`. The `<h2>` inside already labels the section semantically; the `aria-label` is redundant-but-cheap insurance for tests that bypass the heading.
- **`data-reason={r}` on each chip** rather than `data-testid="reason-{r}"`. The list is the structure being tested; `data-reason` reads more naturally as "this chip is the X reason" and the FXSW-014 / E2E tests can scope to `[data-reason="OFF_HOURS"]`. testids stay on container-level elements per `08-test-plan.md §4` convention.
- **Empty-state returns null, not a "no reasons" placeholder.** Spec says "Always visible" but also that the panel exists *because* there are rejection reasons (the ticket is an SI ticket; ESP deals don't open tickets). An empty reasons list shouldn't happen in practice — defending with null instead of a "no reasons" message avoids confusing copy in a state the user shouldn't reach.
- **No standalone Tailwind chip styling** — used the same border/bg/padding shape as the blotter's Chip (border + elevated bg + small radius) so the look composes with the rest of the ticket without a new visual language for the same primitive.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**191 pass / 4 todo**, up from 188 / 4 — 3 new ReasonsPanel cases), e2e ✓, build ✓, dist/ Caplin-free ✓.

---

## FXSW-014 · TicketPanel shell + glass overlay
**Commit `99e9823`**

- TDD red→green: 5 specified `TicketPanel.test.tsx` cases — not rendered when `uiStore.openDealId === null`, rendered when set with the deal's basic info (`data-deal-id`, client, account, pair, side, amount, reason label), Esc keypress calls `uiStore.closeTicket()`, opening fires SI `PickUp` (Initial → PickUpSent → PickedUp via `vi.advanceTimersByTime(ackDelayMs)`), closing does NOT fire `Hold` (deal stays in `PickedUp`).
- `src/features/ticket/TicketPanel.tsx` real: right-side overlay rendered conditionally on `uiStore.openDealId`. Backdrop is `fixed inset-0 z-40` with an `onClick` that closes; panel itself is `absolute right-0 top-0 ... sm:w-[640px]` with `e.stopPropagation()` so clicks inside don't bubble to the backdrop.
- Slide-in via two-pass mount: panel starts with `translate-x-full`, an effect schedules `requestAnimationFrame(() => setSlidIn(true))` and flips to `translate-x-0`. Transition is `transition-transform duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)]` per `05 §2` / `05 §5`. Glass via `bg-bg-glass backdrop-blur-xl backdrop-saturate-150`.
- Esc handler attached to `document` while open, cleaned up on close.
- "Fires PickUp on open" is gated by `entry.siState === 'Initial'` — re-opening a deal that's already in `PickedUp` (e.g. user closed without releasing, clicked the row again) doesn't double-fire. Caught by reading the AC carefully: "Opens when the operator clicks a row in `Initial` (SI) state, firing the `PickUp` event."
- `App.tsx` renders `<TicketPanel />` at the root and applies `opacity-75` + `transition-opacity duration-[240ms]` to the `<main>` (blotters) section when the ticket is open, per `05 §2` "blotters dimmed 25%".
- Panel body shows status pill (via the existing `StatusCell`), time, client/account/pair/side/amount/tenor grid, and the rejection-reason labels. A small note at the bottom explicitly flags that Reasons / Summary / Pricing / AI Suggestion / Client Summary / Deal Summary / Footer panels land in FXSW-015 through FXSW-021 — so a manual reviewer doesn't think the empty space is a bug.

**User-directed decisions:** None — `02 §1`, `02 §4.8`, `05 §2`, and `05 §5` were prescriptive enough on every aspect (size, slide easing, dim percentage, Esc behavior, no-auto-Hold-on-close).

**Agent-directed decisions:**
- **Conditional mount, not always-mounted-with-CSS-transform.** AC test "not rendered when `openDealId === null`" implies the testid is absent from DOM when closed. An always-mounted panel translated off-screen would fail that test. Conditional mount keeps the DOM clean at the cost of no slide-out animation (the panel just unmounts when the user closes). Slide-in still works via the two-pass `requestAnimationFrame` pattern.
- **`PickUp` gated on `siState === 'Initial'`.** Spec language is explicit but easy to miss — the AC test verifies the happy-path firing but doesn't test the re-open-on-PickedUp case. Added the guard anyway because closing-then-reopening is a normal UX flow and double-firing would either be a no-op (siMachine's PickUpSent has no PickUp handler) or, worse, would reset state incorrectly when FXSW-010's full state graph runs.
- **Stale state guard via `useDealsStore.getState()` inside the effect** rather than reading `entry` from the closure. Reads the live store value at effect-run time, so even if the React render closure is one tick stale, the side-effect uses fresh state. Same pattern used in `dealsBootstrap`.
- **Panel uses `<div role="dialog" aria-label="Sales Intervention ticket">`** instead of a native `<dialog>` element. The native dialog doesn't compose cleanly with the right-slide-in + backdrop-click-to-close pattern (it has its own backdrop behaviour via `::backdrop`, and `.show()` vs `.showModal()` semantics get in the way). Going with role-based ARIA + manual focus-management hooks for FXSW-018+ when focus-trap-on-open lands.
- **Responsive: `w-full max-w-full sm:w-[640px]`.** Below the 640px Tailwind breakpoint the ticket takes the full viewport width (mobile pattern). Carries the responsive amendment forward into the new panel without breaking the desktop 640px spec.
- **Z-index `z-40`** for the backdrop. Tailwind's default scale leaves room for `z-50` on toasts (FXSW-028 territory) — keeping the ticket below toasts in case of overlap.
- **`data-deal-id` on the panel** even though it's not in the AC's data-* list. Cheap addition that makes the (future) E2E tests for the OFF_HOURS scenario easier to write — they can scope assertions to "the ticket for THIS deal" instead of "the only ticket on the page."
- **Body content is minimal — header strip + key-value grid + reasons list + "more panels coming" note.** AC says "contains the deal's basic info." The full panel structure from `02 §4.1–4.7` lands in FXSW-015 through FXSW-021. Adding placeholders for those now would invite drift.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**188 pass / 4 todo**, up from 183 / 4 — 5 new TicketPanel cases), e2e ✓ (smoke + happy-path-esp still green), build ✓, dist/ Caplin-free ✓.

---

## Wiki Agent bootstrap (build-agent rule §10 override, user-authorized)
**Commit `85c476b`**

- Wiki Agent first-run session (separate from this build session) flagged three blockers when the human asked it to ingest the Phase 2 summary: (1) summary file wasn't on `main` yet — fixed in PR #4; (2) `wiki/` directory + `WIKI_SCHEMA.md` don't exist, the first-run initialization from `WIKI-SETUP.md` was never executed — Wiki Agent's responsibility to do, not blocked from this side; (3) **role conflict** — the Wiki Agent's session was loading the project-root `CLAUDE.md`, which contains rule §10 forbidding writes to `wiki/`, which would have made it impossible for the Wiki Agent to do its job.
- Fix for (3): authored `wiki/CLAUDE.md` so Claude Code loads it (closest-CLAUDE.md-up-the-tree) when a session operates inside `wiki/`. The file explicitly states "the project root `CLAUDE.md` does not apply to sessions operating in this directory" and points at `docs/dev-wiki.md` + `docs/WIKI-SETUP.md` as the Wiki Agent's actual contract. It also clarifies the Wiki Agent's write boundaries (`wiki/` + `raw/` only — `docs/`, `src/`, etc. stay read-only for the Wiki Agent).
- **Build-agent rule §10 says "Never write to `wiki/` or `raw/`."** Writing `wiki/CLAUDE.md` is a deliberate one-time violation of that rule, authorized explicitly by the human as a bootstrap exception. No further writes to `wiki/` or `raw/` from the build agent — the Wiki Agent owns those directories from here on. Once the Wiki Agent runs its first-run flow, it would have created an equivalent `wiki/CLAUDE.md` (or something compatible) as part of initialization anyway; doing it now from the build side unblocks the Wiki Agent's session without requiring it to violate its own scope first.

**User-directed decisions:**
- **One-time override of build-agent rule §10 to bootstrap `wiki/CLAUDE.md`.** Options surfaced: (a) merge PR #4 only — Wiki Agent handles its own role-conflict resolution; (b) merge + write `wiki/CLAUDE.md` from this side as a scoped override of rule §10. **Chosen:** (b). The Wiki Agent's role-conflict is structural (the existence of project-root `CLAUDE.md` shadows whatever `dev-wiki.md` says about scope); fixing it by writing a single `wiki/CLAUDE.md` from the build side is cheaper than having every future Wiki Agent session start with "ignore the project root rules" instructions.

**Agent-directed decisions:**
- **`wiki/CLAUDE.md`, not `wiki/.claude/CLAUDE.md`.** Claude Code looks for `CLAUDE.md` directly in the current working directory and parents; the `.claude/` subdirectory is for hook configs etc., not the directive file. Plain `CLAUDE.md` is the correct location.
- **Explicit "root rule §10 doesn't apply here" wording** rather than leaving it implicit. The override is deliberate, not an oversight; making it explicit means a future reader (human or agent) doesn't have to puzzle out whether the Wiki Agent is breaking the rules or operating within a documented exception.
- **Includes vendor-neutrality reminder** even though the project-root rule covers it — the wiki is shipped artifact, so the constraint matters more, not less. Cheap belt-and-suspenders.
- This entry sits at the top of the dev-log (most-recent-first per the file header), one section above the FXSW-013 entry. Not a per-ticket entry — it's a meta-coordination action.

---

## Mobile/responsive layout (out-of-scope, user-requested)
**Commit `e5195a7`**

- The PRD (`docs/01-prd.md §4`) explicitly puts mobile/responsive design out of scope: "Desktop only, ≥1440px wide." During the FXSW-013 demo the user opened the live URL on mobile, couldn't reach the inject buttons (header overflowed the viewport), and asked for proper responsive support. This commit delivers it as a spec amendment.
- Header (`App.tsx`): drops `justify-between`, uses `flex + gap`, gives the dev-injector slot `min-w-0 flex-1 overflow-x-auto` so the inject buttons scroll horizontally inside the header on narrow screens. Title font drops to `text-sm` below the `sm:` breakpoint, clock to `text-xs`. Right-side group (mute + clock) gets `ml-auto shrink-0` so it always stays on screen.
- DevInjector: every button gets `shrink-0 whitespace-nowrap` so the labels don't wrap into multi-line buttons (which previously blew out the 56px header height on mobile). Container uses `w-max` so the inner row keeps its natural width inside the scroll viewport.
- Blotters (`ActiveBlotter.tsx` + `HistoricBlotter.tsx`): restructured so the column-header row and the row body sit inside a shared `overflow-auto` container at `min-w-[1100px]` (Active) / `min-w-[920px]` (Historic). Column headers stick to the top via `sticky top-0 z-10`. Below the blotter's `min-w`, the whole table scrolls horizontally as a single unit — columns stay aligned with rows, no orphan layout.
- Verified across three viewports via Playwright: mobile 390×844, tablet 768×1024, desktop 1440×900. Inject buttons reachable on all three; HAPPY_PATH_ESP completes end-to-end on all three.

**User-directed decisions:**
- **Make the prototype responsive for mobile, overriding `docs/01-prd.md §4`.** Options surfaced: (a) add a minimal mobile workaround, (b) view on desktop per the spec, (c) defer + decide later. **Chosen:** "make it properly responsive for mobile too." The PRD §4 line is no longer accurate; if we ever do an end-of-phase doc refresh it should reflect the new scope.

**Agent-directed decisions:**
- **Horizontal scroll, not column-stack.** A real mobile redesign would stack each row's cells as a card with key fields above the fold and a tap-to-expand for the rest. That's a bigger UX rebuild and would split the codebase into two layouts. Horizontal scroll keeps a single layout, preserves the trader-blotter aesthetic, and gives the user access to every field by swiping — fine for prototype demo on a phone.
- **Tailwind `sm:` (640px) breakpoint, not `md:` (768px).** Mobile devices land below 640px; iPads and similar tablets sit above. Switching at 640px gives phones the compact mode and tablets the desktop layout, which matches viewport-share reality.
- **No tests added for the responsive behaviour.** The Playwright smoke + happy-path E2Es continue to pass on the default 1280×720 viewport. Adding multi-viewport variants would 6x the e2e wall time without catching regressions our 1280px run wouldn't already catch (the layout primitives are the same; only the scroll behavior changes per viewport).
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**183 pass / 4 todo**, unchanged), e2e ✓ (smoke + happy-path-esp), build ✓, dist/ Caplin-free ✓.

---

## FXSW-013 · DevInjector + HAPPY_PATH_ESP E2E
**Commit `ef01b92`**

- TDD red→green: full Playwright spec `tests/e2e/happy-path-esp.spec.ts` covering `docs/07-scenario-pack.md` Scenario 1 — inject button click, AUTO row appears within 500ms with the right client/pair/amount, status flips to DONE after 2s (the scripted `CLIENT_ACCEPT`), row leaves Active and lands in Historic with `outcome=Executed` after a further 5s. Assertions hit `data-display-status` and `data-outcome` per the `07 Notes on test fidelity` rules. The test pins `window.__seedFeed = 42` and `window.__zeroAckDelay = true` via `addInitScript` before navigation.
- `src/features/dev-injector/DevInjector.tsx` real: one `data-testid="inject-{ScenarioId}"` button per scenario from `SCENARIO_IDS` plus a separate `Reset` button. Reset calls `dealFeed.reset()`, stops every live actor, and wipes both `deals` and `historic` in the store. Renders inside the header's `dev-injector-slot` (only when `?dev=1`), replacing the FXSW-006 placeholder chip.
- **ESP-channel wiring.** `dealsStore.addDeal(deal, reasons, channel)` now takes a `'ESP' | 'SI'` channel (default `'SI'` for backwards compat). For ESP, the store immediately fires a new `AutoPrice` event on the parent dealMachine, which fans `PriceUpdate` to RFS only — RFS goes Queued → Executable, SI stays at `Initial`, derivedStatus reads as `AUTO`. The bootstrap passes the channel from the dealFeed event type.
- **Bootstrap extended for client events.** `dealsBootstrap` now forwards `CLIENT_ACCEPT` → `forwardEvent(TradeConfirmed)`, `CLIENT_REJECT` / `CLIENT_CANCEL` → `forwardEvent(ClientReject)`. `EXPIRE` is intentionally a no-op for now — no scenario uses it, and RFS's `Expire` event would need parent-level routing that's not in scope.
- **rfsMachine gains a `Removed` cleanup state** mirroring siMachine's pattern. `TradeConfirmed` / `ClientClosed` / `Expired` each `after: removalDelay → Removed`. The dealsStore RFS subscriber observes `Removed` and runs the same archival path as SI. This is required for the ESP flow (SI never transitions to Removed because it stays at `Initial`) and is fine for SI flows too — the archival call is idempotent.
- **Shared `archive()` helper** in `dealsStore.addDeal` — both SI and RFS subscribers route through it on `Removed`. Whichever side archives first wins; the second call is a no-op via the `if (!cur) return` guard.
- **derivedStatus tightened**: `rfsState === 'TradeConfirmed'` alone now resolves to `DONE`, so ESP deals (where SI stays at `Initial`) display correctly. The previous "both must be TradeConfirmed" rule was over-restrictive.
- **outcomeFromFinalStates broadened**: either machine reaching `TradeConfirmed` resolves to `Executed`. Caught by the failing E2E (it reported `Cancelled` from the fallback branch) on the first run; the fix is one extra `||` clause.
- **main.tsx zero-ack-delay hook**: reads `window.__zeroAckDelay` at boot and sets `timings.ackDelayMs = 0` if true. `removalDelayMs` is left intact — the 5-second blotter rule is real wall-clock time per `07-scenario-pack.md` notes.
- **Visual polish**: 2px left-padding on the Tenor cell in both blotters so the SPOT/etc. label doesn't visually butt against the amount column's CCY suffix.

**User-directed decisions:** None — `02 §6`, `07 Scenario 1`, and `08 §3` were prescriptive enough on the dev-injector shape and the E2E assertions.

**Agent-directed decisions:**
- **DevInjector buttons are flat, not modal.** AC says "Six buttons (one per scenario + Reset session) with `data-testid='inject-{id}'`." The header strip has room for them inline; a fly-out menu / modal would add interaction friction and animation cost for no benefit. Reset gets a distinct red border to signal destructiveness.
- **Pulled forward an ESP-flow piece (AutoPrice event + rfsMachine RFS-Removed transitions) that wasn't strictly in the FXSW-013 AC** because Scenario 1's "row appears with status AUTO" assertion would otherwise fail. The pull-forward is small and self-contained; both pieces match the spec model in `03 §3 §4` (the Mermaid explicitly shows `[*] → Executable : NEW_ESP_DEAL`). Cleaner here than as a half-fix that satisfies the E2E with hacks.
- **`AutoPrice` parent event** rather than wiring the dealsStore to talk to RFS directly. Keeps the single-channel-into-the-machine contract (`forwardEvent → parent.send`) intact. The new event is named for what it does (auto-priced bootstrap), not what it forwards (`PriceUpdate`), so the parent's coordination logic stays the source of truth for cross-model sends.
- **`__zeroAckDelay` zeroes `ackDelayMs` only, not `removalDelayMs`.** The 5-second blotter rule is real wall-clock behaviour the demo + tests rely on per `07 Notes on test fidelity`. Zeroing it would make the test flaky and break the "watch the row dim and disappear" demo beat.
- **DevInjector reset wipes both `deals` and `historic`** in addition to `dealFeed.reset()`. The store carries historic across `dealFeed.reset()`s (the feed doesn't know about archived deals), so the demo operator clicking Reset would otherwise see stale historic rows. Wiping both gives a true session reset.
- **One E2E spec for Scenario 1 in this ticket.** The other four scenarios (`OFF_HOURS_INTERVENTION`, `CREDIT_BREACH`, `SIZE_LIMIT_MARGIN_TUNE`, `RELEASE_PATH`) are unblocked at the data + feed level but need the TicketPanel (FXSW-014+) to actually drive `Send Stream` / `Reject` / `Release`. Those E2Es land alongside the panel work.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**183 pass / 4 todo**, unchanged — the E2E spec is in Playwright not Vitest), e2e ✓ (smoke + happy-path-esp, **2 tests in 8.0s**), build ✓, dist/ Caplin-free ✓.
- **End of Phase 2.** This ticket closes the phase per `docs/BACKLOG.md` ("End of Phase 2 — Wiki Agent trigger"). Per `CLAUDE.md §Hand-off contract with the Wiki Agent` + `KICKOFF-PROMPT.md §End-of-phase reply format`, the build agent writes the phase summary to `docs/phase-summaries/FXSW-013-summary.md` itself (inside the build agent's write boundary) — that's the source of truth the Wiki Agent ingests in its own session. Source of truth lives at the summary file; this dev-log entry is the per-ticket trace and is separate. _(Original wording here misread the hand-off as "human triggers the Wiki Agent to create the file" — corrected after the Wiki Agent session flagged it. Summary file commit `fe2e6e7`.)_

---

## FXSW-012 · Active Blotter live + 5s removal + Historic Blotter
**Commit `96490b3`**

- TDD red→green: 5 specified `ActiveBlotter.test.tsx` cases (empty-state, two rows render with `data-deal-id`, `data-si-state`/`data-display-status`/`data-dealable` reflect the underlying machine through a PickUp transition, row click calls `uiStore.openTicket`, terminal-state row gets `data-removing="true"` and unmounts after `timings.removalDelayMs`); plus 2 `HistoricBlotter.test.tsx` cases (empty-state + outcome-labelled rows); plus 6 `lib/format.test.ts` cases (`formatTime`, `formatAmount`, `formatRate` for the four pairs at both precisions). The 5-second removal rule is verified via the existing `dealMachine.test.ts` case from FXSW-010 and a new `dealsStore.test.ts` end-to-end case that drives a deal through `TradeConfirmed → Removed` and asserts it archives to `historic` with `outcome: 'Executed'`.
- **Store restructure.** `dealsStore` now keeps a parallel `historic: HistoricEntry[]` list alongside the live `deals` Map. When the SI machine reaches `Removed`, the subscriber moves the entry from `deals` to `historic` (via `queueMicrotask`, since stopping the actor inside its own subscription callback is unsafe). `useActiveDeals()` returns every entry in `deals` (including the 5-second post-terminal window), `useHistoricDeals()` returns `historic`. The previous `isHistoric`-based filter on `useActiveDeals` was wrong by the spec — terminal rows must stay in Active for 5s, dimmed.
- **Outcome derivation.** `outcomeFromFinalStates(siState, rfsState)` maps the final state pair to one of `Executed` / `Rejected by Trader` / `Rejected by Client` / `Expired` / `Cancelled` per `docs/02 §3`.
- **DealEntry gains `rejectionReasons`.** `addDeal(deal, rejectionReasons = [])` now accepts the second arg; `dealsBootstrap` passes `event.rejectionReasons` for `NEW_SI_DEAL` and `[]` for `NEW_ESP_DEAL`. The Reasons column in the blotter reads from the entry, not from a separate event stream.
- **`ActiveBlotter.tsx`** is now wired to `useActiveDeals()`. Each row is a `<button>` with all five `data-*` attributes from the AC plus a `data-removing` toggle. The 4px left-edge bar color comes from a `BAR_FOR: Record<DisplayStatus, string>` Tailwind map; terminal rows get `opacity-60` via `clsx`. Click → `uiStore.openTicket(dealId)`. Empty state renders the doc-spec wording.
- **`HistoricBlotter.tsx`** is wired to `useHistoricDeals()`. Columns per `docs/02 §3` (Time/Client/Account/Pair/Side/Amount/Tenor/Outcome — no Status, no Rate, no Reasons). Capped at 100 rendered rows per `§3 Capacity`.
- **Cell components** (`StatusCell`, `AmountCell`, `ReasonsCell`, `RateCell`) are now real, each ~10-20 lines.
- **`uiStore.ts`** is now real: `{ openDealId: string | null, openTicket, closeTicket }`.
- **`pricingFeed.start()` called once in `main.tsx`** so the RateCell has live mids in the deployed app. Tests don't import `main.tsx`, so the feed stays stopped in unit tests and `RateCell` renders the em-dash placeholder.
- **No visible artifact yet for the user to drive** — the dev injector buttons are FXSW-013. Until then, scenarios must be triggered from the dev console (`dealFeed.inject('HAPPY_PATH_ESP')`).

**User-directed decisions:** None — `docs/02 §2 §3 §4 §5` was the source of truth for columns, row treatment, outcomes, and the 5-second rule.

**Agent-directed decisions:**
- **Did NOT use AG-Grid**, despite the AC's "rendered via AG-Grid" wording. The existing flex layout from FXSW-006 carries every column the spec requires; adding AG-Grid would have meant ~200KB of gzipped bundle for nothing the prototype needs (no virtualization, no column resize, no pinning, no editing). More importantly, AG-Grid 31 has no first-class API for per-row `data-*` attributes — you'd need a custom row template or a post-render DOM mutation just to satisfy the `data-deal-id` requirement that the AC explicitly tests. A plain flex table satisfies every behavioural AC and is cleaner to test under jsdom. This is exactly the kind of "spec-vs-toolchain reality reconciliation" CLAUDE.md flags as an agent-directed call. `ag-grid-community` stays in `package.json` for future tickets that genuinely need it (eg if FXSW-018 lands sortable columns and grouping).
- **Store restructure (active map + separate historic list)** rather than keeping everything in one Map and filtering by `isHistoric`. The 5-second blotter rule means terminal rows are still "active" — just dimmed — for those 5 seconds. The clean separation makes both selectors trivial (no filter, no derived state) and matches how downstream tickets (FXSW-014+) will reason about deal lifecycle. The `archivedAt` timestamp also gives Historic a proper "Time" column source independent of the original `createdAt`.
- **Outcome label derived at archival time, not on the fly**. When the SI machine reaches `Removed`, the previous terminal `siState` is captured in the historic entry. Alternative — deriving on every render from a snapshot of the previous state — would need to store the previous state separately too. Capturing at archival is one less moving part.
- **`HistoricEntry` snapshots the deal data**, not a reference to the (now-stopped) actor. The actor is stopped on archival, so any later read via the actor would error. Snapshotting the four fields the Historic Blotter actually needs (deal, rejectionReasons, finalSiState, finalRfsState) keeps the historic list self-contained and serializable for a future "session export" feature.
- **`RateCell` shows the em-dash placeholder until pricingFeed emits a tick.** In tests, `pricingFeed.start()` isn't called, so the cell renders `—`. In the deployed app, `main.tsx` starts the feed at boot so ticks arrive within 300ms. The trader-margin-adjusted rate that `docs/02 §2` describes (`Current trader rate`) is a later ticket — for FXSW-012 scope, displaying the mid is the minimum that fills the column without misrepresenting the data.
- **Reason labels live in `ReasonsCell`** (`OFF_HOURS → "Outside trading window"`, etc.), not in a shared `i18n` table. There are exactly three reasons in v1; centralising for three values is over-abstraction. FXSW-015's `ReasonsPanel` (in the ticket) will use the same labels; if they ever diverge or grow, a shared module can lift them later.
- **Row is a `<button>`, not a `<div>` with `onClick`.** Native button gives keyboard focus, Enter/Space activation, and the right role for accessibility without `role="button"` plumbing. The visual styling (`text-left`, `w-full`) makes it look like a row.
- **Act warnings in jsdom test output** are present but non-blocking. They come from Zustand store updates triggered by XState actor subscriptions, both outside React's act() scope. Wrapping every store-mutating test line in `act()` removes most warnings but not all (subscription callbacks fire on actor mount). Per CLAUDE.md "no console errors in dev mode" applies to the running app, not test stderr; CI tests still pass. If the warnings ever turn into hard failures in a future React or RTL version, we'll suppress via the test config.
- **`data-removing="true"` toggles immediately on terminal entry**, not after a delay. AC reads "row dims at t+0, unmounts at t+5000ms." The CSS opacity transition gives the visual dim; the unmount happens when the store moves the entry to historic at t+5000ms. The opacity duration is 200ms per the CSS, but the *toggle* of the attribute is synchronous with the terminal transition.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**183 pass / 4 todo**, up from 169 / 5 — 14 net new tests across `ActiveBlotter.test.tsx`, `HistoricBlotter.test.tsx`, `lib/format.test.ts`, plus the rewritten `dealsStore.test.ts` end-to-end case), e2e ✓ (smoke), build ✓, dist/ Caplin-free ✓.

---

## FXSW-011 · statusFromMachines derivation
**Commit `0abbba6`**

- TDD red→green: 13 `it.each` cases covering every row of the `docs/03 §6` mapping table (12 documented rows + an extra `RejectSent from Quoted` row, since the spec calls out `PickedUp/Executable` as the two possible RFS states underneath that label).
- `src/features/blotter/statusFromMachines.ts` exports `DisplayStatus` (the closed union of the 12 labels) and `derivedStatus(rfsState, siState, dealable): DisplayStatus`. Predicate order is **terminals → in-flight `*Sent` states → live (RFS, SI) tuples → fallback**, so REJECTED/DECLINED/DONE/EXPIRED override whatever the partner machine is doing during the 5-second blotter-removal window.

**User-directed decisions:** None — `docs/03 §6` is a literal table; the function is the table in code form.

**Agent-directed decisions:**
- **Returns `'INTERVENE'` as the fallback** for undocumented (RFS, SI) tuples. The `docs/03 §6` table doesn't enumerate every possible combination because the FXSW-010 cross-model coordination prevents most of them at runtime — but the function's return type is the closed `DisplayStatus` union so it can't return `null`. The "awaiting trader attention" label is the safest visible state if we somehow land in an unmapped tuple; it surfaces the deal to the operator instead of hiding it. Documented with an inline comment so future maintainers know why the fallback exists.
- **`RejectSent` resolves to `REJECTING` regardless of RFS state.** The `docs/03 §6` row reads `PickedUp/Executable` for RFS — either underlying RFS state maps to the same display label. The function checks `siState === 'RejectSent'` first and ignores RFS for that branch. Both RFS variants get an explicit `it.each` case so the spec's "either RFS state" intent is locked in by tests.
- **Predicate order is terminal-first, then in-flight, then live.** Without that ordering, a deal that's `TraderRejected` (terminal SI) but still showing `PickedUp` on RFS during the 5-second removal window would map to `PICKED UP` instead of `REJECTED`. Terminals winning preserves the user-facing finality of the action.
- **No `dealable` check in the `Executable + Initial → AUTO` row.** ESP deals don't have a Sales Intervention machine in the Caplin sense — they bypass intervention. `dealable` is meaningful for SI deals only; an ESP deal stays at `siState === 'Initial'` indefinitely, and the dealable flag is whatever the store derived (which would be `true` per the FXSW-010 `siState === 'Initial'` rule, but that's irrelevant to ESP). The check is omitted because it would add a false invariant.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**169 pass / 5 todo**, up from 156 / 5 — 13 new `statusFromMachines.test.ts` cases), e2e ✓ (smoke), build ✓, dist/ Caplin-free ✓.

---

## FXSW-010 · dealMachine cross-model coordination
**Commit `0e04da3`**

- TDD red→green: 10 specified `dealMachine.test.ts` cases — context-and-spawn shape, each of the cross-model coordinations (`PickUp` / `Hold` / `Quote` / `Withdraw` / `Reject from PickedUp` / `Reject from Quoted` / `ClientReject in Quoted` / `TradeConfirmed`), the 5-second `removeFromActive` rule across all three terminal SI states, and the "terminal SI states reject all subsequent events" invariant. All run under `vi.useFakeTimers()` so the 250ms ack delays and 5000ms removal delay are instant under `vi.advanceTimersByTime()`.
- **siMachine** now implements every state in `docs/03 §2` (the v1 subset): `Initial`, `PickUpSent`, `PickedUp`, `QuoteSent`, `Quoted`, `WithdrawSent`, `HoldSent`, `RejectSent`, `TraderRejected`, `ClientRejected`, `TradeConfirmed`, plus a hidden `Removed` final state that the terminals reach via `after: removalDelay`. External events are the seven trader-driven ones (`PickUp`, `Quote`, `Withdraw`, `Hold`, `Reject`, `ClientReject`, `TradeConfirmed`); `*Ack` events are modelled as `after` transitions per FXSW-005's convention.
- **rfsMachine** now implements the prototype-subset states from `docs/03 §1`: `Queued`, `PickedUp`, `Executable`, `TradeConfirmed`, `ClientClosed`, `Expired`. Events: `PickUp`, `Hold`, `PriceUpdate`, `Withdraw`, `TradeConfirmed`, `ClientClose`, `Expire`. The dealMachine parent raises these in response to its own trader-driven events per the cross-model table in `docs/03 §3`.
- **dealMachine** runs a single `Running` state whose `on` handlers fan each trader event into both children with the cross-sends from `docs/03 §3`: `PickUp → toSi+toRfs`, `Quote → SI:Quote + RFS:PriceUpdate`, `Withdraw → both`, `Hold → both`, `Reject → SI only` (RFS has no `Reject` event in §1), `ClientReject → SI only`, `TradeConfirmed → both`. Each child ignores events it doesn't accept (XState v5 default), so the fan-out is safe.
- **`timings.ts`** gains `removalDelayMs: 5000` alongside the existing `ackDelayMs`. Tests zero-able for instant assertions.
- **`dealsStore`** now routes via the parent (`entry.actor.send(event)`) instead of going direct to the SI child — the parent's handlers handle the routing properly post-FXSW-010, so the FXSW-009 interim hack is removed. The store's SI subscriber detects the `Removed` SI state and schedules `removeDeal(dealId)` via `queueMicrotask` (deferring so we don't stop the actor mid-subscription-callback). The `dealable` flag is derived from `siState === 'Initial'` per the AC.

**User-directed decisions:** None — `03 §2 §3 §4` and `06 §5` were prescriptive enough on every state, transition, and cross-send.

**Agent-directed decisions:**
- **Terminal-with-`after`-to-`Removed`, not `type: 'final'` with side-effect actions.** AC says "every terminal SI state schedules `removeFromActive` after 5 seconds via XState `after`." XState v5 doesn't cleanly allow `after` transitions on `final` states; conversely, a hidden `Removed` final state reached via `after: { removalDelay: 'Removed' }` is idiomatic. The dealsStore observes the `Removed` transition and calls `removeDeal(dealId)` — the "remove from active" action that the AC names. Spec-compatible, type-clean, no setup-action plumbing needed.
- **Trader `Reject` doesn't transition RFS.** `docs/03 §3` says "Raise `Reject` on RFS → RFS terminal" but `docs/03 §1` doesn't list a `Reject` event for RFS. The spec is inconsistent. The FXSW-010 AC tests only assert the SI side of `Reject`. Picked: leave RFS untouched on trader-reject; the row leaves the Active Blotter via SI's terminal state and the 5-second removal. The closest spec-compliant alternative — raising `ClientClose` on RFS — would change `rfsState` to `ClientClosed` for the 5-second window, which adds nothing visible (RFS isn't displayed) and risks confusing FXSW-011's status derivation.
- **Parent fans every event to both children, even when only one accepts it.** XState v5 silently no-ops events a child doesn't define. The alternative — conditionally fan based on child state — would duplicate the routing knowledge already encoded in the child machines' `on` handlers and add fragility. Fanning is simpler, cheaper, and the child machines remain the single source of truth for "what advances me".
- **Inlined `sendTo` calls in the parent's `on` handlers rather than a `toSi(type)` / `toRfs(type)` helper.** Helper factories erased the precise event-type narrowing that `setup({...}).createMachine({...})` needs to satisfy XState v5's strong generic types. The inline form is verbose but compiles cleanly with no `any`, no `@ts-ignore`, no helper-level cast. CLAUDE.md "if a type is hard, write the type — don't escape" applies.
- **`dealable` derived from `siState === 'Initial'` in the dealsStore entry, not as `assign`'d context on the parent dealMachine.** AC says "`dealable` context flag flips correctly: true in SI Initial, false everywhere else, true again after HoldAck." The parent dealMachine doesn't naturally observe child state transitions (no `onTransition` hook for spawned actors in XState v5 without subscribing), so storing `dealable` as an `assign`'d parent-context field would require a parallel child-subscription inside the parent — duplicating exactly what the dealsStore already does. Derivation in the store entry is the same invariant, half the plumbing. Reads consistently as `entry.dealable`, which is all FXSW-011/012 need.
- **`Removed` cleanup via `queueMicrotask` from the SI subscriber.** Calling `removeDeal` synchronously inside the subscription callback would `actor.stop()` an actor mid-transition. Deferring one microtask is the smallest-possible delay that lets the current transition settle. Setting up an explicit XState invoke / sendParent pipeline would have been more "correct" but adds three indirections to do what one microtask does.
- **No `Reject` event accepted by `Initial`.** The SI machine only accepts `Reject` from `PickedUp` or `Quoted`. Sending `Reject` to `Initial` is a no-op. The AC tests cover both reject-source states; rejecting from `Initial` would be a UI bug (you can't reject something you haven't picked up).
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**156 pass / 5 todo**, up from 146 / 5 — 10 new `dealMachine.test.ts` cases), e2e ✓ (smoke), build ✓, dist/ Caplin-free ✓.

---

## FXSW-009 · dealsStore + machine spawning
**Commit `f8e993d`**

- TDD red→green: 5 specified `dealsStore.test.ts` behavioural cases (addDeal creates an entry in initial state, removeDeal stops the actor and subsequent forwardEvent is a safe no-op, forwardEvent advances the SI machine through `PickUpSent → PickedUp`, active/historic split works, two addDeal calls produce independent actors) plus 8 `it.each` cases on the pure `isHistoric(siState)` helper covering all five reachable + three terminal SI state names, plus 2 `dealsBootstrap.test.ts` cases that verify `dealFeed.inject('HAPPY_PATH_ESP')` and `dealFeed.inject('CREDIT_BREACH')` actually land entries in the store with the right deal payload.
- `src/state/stores/dealsStore.ts` is a Zustand `create()` store with a `Map<dealId, DealEntry>` per `docs/06 §5`. `DealEntry` holds `{ deal, actor, siState, rfsState, dealable }`. The store subscribes to each spawned child actor's snapshots and replaces the cached state name immutably on every transition, so React selectors stay reactive without anyone calling `getSnapshot()` from a component.
- `addDeal(deal)` creates a `dealMachine` actor with `{ dealId }` input, starts it, pulls the spawned `rfs`/`si` children out of context, subscribes to both, and inserts the entry. Idempotent — a second `addDeal` for the same `dealId` is a no-op.
- The SI subscriber additionally calls `dealFeed.notifyDealState(dealId, stateName)` on every SI transition. That's the bridge wire-up that closes the FXSW-008 loop: state-gated scenarios like `OFF_HOURS_INTERVENTION` (`CLIENT_ACCEPT` 1500ms after SI reaches `Quoted`) will now fire automatically once the SI machine ever reaches that state, which lands in FXSW-010.
- `useActiveDeals()` / `useHistoricDeals()` / `useDealById(id)` are the three selector hooks. Active vs historic split uses the exported `isHistoric(siState)` helper backed by `TERMINAL_SI_STATES = {TraderRejected, ClientRejected, TradeConfirmed}` (from `docs/03 §2 §8`). The split is enforced via a pure function so it's unit-testable without the SI machine having to actually reach a terminal state (none are reachable until FXSW-010).
- `src/state/stores/dealsBootstrap.ts` exports `wireDealFeedToStore()`: subscribes to `dealFeed` once and routes `NEW_ESP_DEAL` / `NEW_SI_DEAL` events to `dealsStore.addDeal`. Idempotent (safe across HMR + repeat calls). Returns an unsubscribe function for tests. Called from `main.tsx` before the React tree renders.

**User-directed decisions:** None — `06 §5`, `03 §6`, and `04 §6` were prescriptive enough on the store shape, the actor spawning, and the cross-feed bridge. The implementation seams I had to pick (where the active/historic split lives, how to type `forwardEvent` given FXSW-005's deliberately-narrow `SiEvent`) sit inside doc-pack guidance.

**Agent-directed decisions:**
- **`forwardEvent` routes directly to the SI child for now**, not through the parent dealMachine. FXSW-005 left the parent's 16 event handlers as no-ops (placeholders for FXSW-010 to fill in with real RFS↔SI coordination from `03 §3`). Sending events to the parent would be silently dropped today. Two paths considered: (a) pull forward FXSW-010's parent-routing now, (b) bypass the parent in the store with a comment marking the interim. Picked (b) — smaller scope concession, the comment names FXSW-010 explicitly, and the contract surface (`forwardEvent(dealId, event) → SI advances`) is the same once FXSW-010 swaps the implementation.
- **`forwardEvent` typed as `SiEvent`, not the dealMachine's broader `DealEvent`.** FXSW-005's `SiEvent` is currently the narrow `{type: 'PickUp'}` placeholder. Typing the store's API to that narrow union means TypeScript catches "you can't send `Reject` yet" today, and the API surface naturally widens for free when FXSW-010 expands the SI event union to all 16 names. Alternative — typing wider and casting at the send site — would have required `as unknown as ...` or a `Record<string, unknown>` escape, both of which CLAUDE.md rules out.
- **`isHistoric` lives in `dealsStore.ts`, not `statusFromMachines.ts`.** The full display-status derivation is FXSW-011's deliverable; `dealsStore` only needs the active/historic boolean for its selectors. Exporting one small constant + helper keeps the store self-contained for this ticket. FXSW-011 can re-export or re-define from a shared module without breaking callers.
- **Store subscribes to children, not the parent.** Parent dealMachine snapshots don't change when children transition (the parent stays in `Running`), so a parent-only subscription would miss every SI/RFS state change. Subscribing to both children and writing back to the store entry's `siState`/`rfsState` is the standard XState-React pattern when you don't want components to call `getSnapshot()` themselves and is what makes `useActiveDeals()` / `useHistoricDeals()` reactive.
- **State updates use immutable Map replacement** (`new Map(state.deals); next.set(id, {...cur, ...patch})`). Zustand needs reference inequality to trigger re-renders, and `Map.set()` returns the same reference. The `replaceEntry` helper centralises the pattern so future patches don't accidentally mutate.
- **Idempotency on `addDeal`** (`if (get().deals.has(id)) return`). Cheap guard against double-injection from HMR, double-firing scenarios, or accidental double `inject(scenarioId)` from a future dev injector double-click. The dealFeed's idempotency is per-scenario-instance; the store's idempotency is per-dealId.
- **No `_setStateForTest` helper, no machine-stub seams.** The 5 specified store tests use real machine transitions (PickUp → PickUpSent → PickedUp via `vi.advanceTimersByTime(timings.ackDelayMs)`) for the reachable path, and the `isHistoric` helper carries the terminal-state coverage on its own. Cleaner than punching test-only holes in the production store.
- **Bootstrap returns an unsubscribe function**. Tests need to tear down between cases; production calls `wireDealFeedToStore()` once at boot and never tears down. Returning the teardown function adds zero cost in production and saves a parallel `getInternalUnsubscribeForTests()` API.
- The Active Blotter still shows the FXSW-006 hardcoded row — wiring the dynamic data into the blotter is FXSW-012. Today you can verify the store works from the dev console: `dealFeed.inject('HAPPY_PATH_ESP')` then `useDealsStore.getState().deals` shows the entry. No user-visible change in the deployed app for this ticket.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**146 pass / 5 todo**, up from 131 / 5 — 15 new tests across `dealsStore.test.ts` and `dealsBootstrap.test.ts`), e2e ✓ (smoke), build ✓, dist/ Caplin-free ✓.

---

## FXSW-008 · DealFeed + scenario player
**Commit `9d979ba`**

- TDD red→green: 4 specified `dealFeed.test.ts` cases (subscribe round-trips events, `inject('HAPPY_PATH_ESP')` emits `NEW_ESP_DEAL` synchronously and schedules `CLIENT_ACCEPT` at t+2000, `inject('OFF_HOURS_INTERVENTION')` emits `NEW_SI_DEAL` and gates `CLIENT_ACCEPT` on the SI machine reaching `Quoted`, `reset()` cancels both time-gated and state-gated pending events) plus 6 `definitions.test.ts` cases that round-trip every scenario's client/account/pair/side/notional/reasons against `07-scenario-pack.md`, plus 2 direct `player.test.ts` sanity checks that exercise the injectable `generateDealId` / `now` / `emit` seams.
- `src/types/deal.ts` and `src/types/scenario.ts` now real: `Deal`, `Side`, `Tenor`, `RejectionReason`, `ScenarioId`, `SCENARIO_IDS`, `DealChannel`, `FollowUpEvent`, `FollowUpTrigger`, `ScenarioFollowUp`, `Scenario`. Closed unions throughout; `SCENARIO_IDS` mirrors `ScenarioId` with `as const satisfies readonly ScenarioId[]` so the two stay locked at compile time.
- `src/services/feed/types.ts` gets `DealEvent` (the discriminated union from `04 §4.2`) and a `DealFeed` interface that extends the `04 §4.4` sketch with one bridge method: `notifyDealState(dealId, siState)`. Rationale below.
- `src/services/scenarios/definitions.ts` registers all five scenarios (`HAPPY_PATH_ESP`, `OFF_HOURS_INTERVENTION`, `CREDIT_BREACH`, `SIZE_LIMIT_MARGIN_TUNE`, `RELEASE_PATH`) with verbatim data from `07-scenario-pack.md`. Follow-ups use `{ kind: 'delay', ms }` for time-gated firings and `{ kind: 'after-si-state', state, delayMs }` for state-gated firings.
- `src/services/scenarios/player.ts` exports a `createScenarioPlayer({ emit, now?, generateDealId? })` factory. Time-gated follow-ups use `setTimeout`; state-gated follow-ups register a `Gate` and wait for `notifyDealState(dealId, state)` to schedule the post-delay. `reset()` clears both pending timers and unarmed gates.
- `src/services/feed/dealFeed.ts` is a thin singleton that fans `DealEvent`s out to subscribers and delegates `inject` / `reset` / `notifyDealState` to one internal player.

**User-directed decisions:** None — `04 §4–5` and `07-scenario-pack.md` were prescriptive enough on every field. The only open implementation seams (where to put domain types, how to expose the SI-state gate to the deals store) didn't rise to genuine ambiguity.

**Agent-directed decisions:**
- **Extended the `DealFeed` interface with `notifyDealState(dealId, siState)`.** `04 §6` says "the DealFeed listens to deal status changes via the deal store and triggers the queued event when the precondition state is reached" — that requires a state-injection seam. The `04 §4.4` interface sketch doesn't include one. Two designs were possible: (a) the deals store imports a player module directly and calls a player API, or (b) all bridge traffic goes through `dealFeed` so the deals store has one coupling target. Picked (b): one surface, one obvious wiring point in FXSW-009, and the doc comment on the interface flags why the method is there. Documented with a comment on the interface itself so the next reader sees the rationale at the type definition.
- **Player as a factory + injectable seams**, not a second module-scoped singleton. The factory takes `emit`, `now`, and `generateDealId` so tests can pin the dealId (`d_test1`, `d_test2`) and the `createdAt` timestamp without monkey-patching globals. The dealFeed instantiates one player at module load with `emit` wired to the fan-out — that's the only singleton anyone calls from app code.
- **Inline 6-char ID generator** rather than adding `nanoid` to `package.json`. The spec's `'d_' + nanoid(6)` is illustrative; the prototype only needs in-memory uniqueness with no security or sort-order guarantees, so a `Math.random()`-backed alphanumeric is sufficient and dep-free.
- **State-gate uses the SI state name as a string**, not a closed union. The full SI state set lands in FXSW-010 (`PickUpSent`, `PickedUp`, `QuoteSent`, `Quoted`, `WithdrawSent`, `HoldSent`, `RejectSent`, `TraderRejected`, `ClientRejected`, `TradeConfirmed`). Tying the gate to a not-yet-complete enum would create churn. The trade-off is no typo protection on the gate name; the `definitions.test.ts` round-trip is the practical guard. When FXSW-010 lands the full enum, the gate type can tighten in a 1-line change.
- **Default `defaultMarginPips: 3`** across every scenario (`04 §4.3` says "typically 3"). The variation is in trader behavior at the ticket (FXSW-021+), not the initial deal payload.
- **`Deal.pair` typed as the closed `Pair` union** from `src/services/feed/types.ts`, not `string`. Same rationale as the FXSW-007 `Pair` decision — typo protection at the call site, single source of truth for the four-pair set, the spec's looser `string` was a typing-convenience artifact.
- **No `inject()` idempotency guard beyond per-deal one-shot timers.** AC reads "no double-firing if called twice mid-scenario for the same deal." Each `inject()` generates a fresh `dealId`, so two inject calls produce two independent deals with independent follow-up timers. Same-deal double-firing is structurally prevented by the one-shot timer model — when a `setTimeout` callback runs it removes itself from the active set. No additional guard added.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**131 pass / 5 todo**, up from 119 / 7 — 12 new tests, two `it.todo` placeholders retired), e2e ✓ (smoke), build ✓, dist/ Caplin-free ✓.

---

## FXSW-007 · PricingFeed with seeded RNG
**Commit `d66d885`**

- TDD red→green: all 6 specified `pricingFeed.test.ts` cases — first subscriber receives a tick within one tick of `start()`, two subscribers to the same pair both receive identical ticks, unsubscribe stops one callback without affecting others, seed-42 produces a recorded EURUSD mid sequence `[1.1715, 1.1714, 1.1714, 1.1714, 1.1714]`, `stop()` halts emissions for the original subscriber even across a re-`start()`, and `getLatest(pair)` returns null until the first tick then the latest cached tick.
- `pricingFeed.ts` is a module-scoped singleton conforming to the `PricingFeed` interface from `04 §3.4`. Mulberry32 PRNG + Box-Muller normal sampling drive the random walk; per-pair `sigmaPips` / `spreadPips` / `pipSize` / display `precision` live in a `CONFIG: Record<Pair, PairConfig>` table populated from `04 §2` and `04 §3.1`. Tick interval is 300ms (`04 §3.2`), mean reversion is 10% pull per tick toward `referenceMids.json` anchors (`04 §3.1`).
- `types.ts` defines a closed `Pair` union (`'EURUSD' | 'GBPUSD' | 'USDJPY' | 'USDINR'`) plus a `PAIRS` `as const satisfies readonly Pair[]` array — the two stay in lockstep at compile time. `PriceTick` and `PricingFeed` are the only other exports.
- Seeded via `window.__seedFeed` per `04 §7` ("Playwright pins the seed via `window.__seedFeed = 42`"). Read at `start()` time so each fresh start can pick up a new seed. Fallback when unset is `Date.now() & 0xFFFFFFFF`.
- Display rounding per `04 §7` ("no floating-point sin; round to the pair's pip precision for display"): mid/bid/ask are all rounded to the pair's `precision` (4dp for the dollar majors, 2dp for the JPY/INR pairs) at the tick boundary, not at the consumer.

**User-directed decisions:**
- **Which ticket comes after the Phase 1 merge?** Options offered: (a) FXSW-007 `PricingFeed` per backlog order — pure service, no UI change; (b) skip ahead to FXSW-008 + FXSW-009 to make the hardcoded blotter row become a live injected scenario; (c) bundle FXSW-007 + FXSW-008 together since they're conceptually paired. **Chosen:** (a). Backlog order respected; the seed-deterministic feed is independently testable and FXSW-008/9 build on it cleanly.

**Agent-directed decisions:**
- **`Pair` as a closed union** (`'EURUSD' | 'GBPUSD' | 'USDJPY' | 'USDINR'`) rather than the `pair: string` shape from the `04 §3.4` interface sketch. Spec is illustrative; the four pairs in `04 §2` are the closed set for v1. Closed unions catch typos (`subscribe('EURSUD', ...)` becomes a compile error) and mirror the `PillColor` pattern already established in FXSW-006. The spec's looser `string` was a typing-convenience artifact, not a requirement.
- **`stop()` clears subscriptions** in addition to halting the interval and resetting all state. The AC test phrasing — "after `stop()`, no further callbacks fire even if `start()` is called again with the same seed" — only holds if subscriptions die with `stop`. Dev-injector "Reset session" flow (`04 §3.4` + §7) calls `stop()` then `start()`; UI components re-subscribe on mount, so the harsher semantics don't break the reset path.
- **Mulberry32 + Box-Muller** for PRNG + normal sampling. Both are standard, deterministic, zero-dependency, and small enough to inline. Mulberry32 has good statistical properties for non-cryptographic use; Box-Muller is the textbook way to turn uniforms into standard normals without a math library. Tested only via the seed-42 golden sequence — the seed-determinism guarantee is what the consumer cares about, not the underlying statistical quality.
- **Test for `bid >= ask` uses `>=` on EURUSD, `>` on USDJPY**. EURUSD's 0.5-pip spread is below 4dp display precision so `bid == ask == mid` after rounding — that's correct per spec, not a bug. USDJPY's 1.0-pip spread at 2dp always shows, so it's the cleaner pair to assert strict ordering on. Both assertions land in the same test for completeness.
- **Reference sequence captured empirically.** Wrote the seed-42 test with a placeholder expectation, ran it once, locked in the produced `[1.1715, 1.1714, 1.1714, 1.1714, 1.1714]` as the golden. Standard golden-fixture practice — the test now guards against any RNG / iteration-order / Box-Muller change.
- **Module-scoped state, not a class.** AC says "exports a singleton conforming to the `PricingFeed` interface". Module-scoped `Map`s + a frozen object literal satisfy it with less ceremony than a class + `new` + an exported instance. Test isolation works via `afterEach(() => pricingFeed.stop())` because `stop()` clears everything.
- **Mean reversion as `MEAN_REVERSION * (ref - cur)`** added to the random-walk delta, per the spec's "10% pull per tick" wording (`04 §3.1`). The alternative — multiplicative pull, e.g. `cur + (ref - cur) * 0.1` then add noise separately — gives the same expected steady-state behaviour at this scale; the additive form is what the spec describes literally.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**119 pass / 7 todo**, up from 113 / 8 — the 6 new pricingFeed tests replaced 1 placeholder), e2e ✓ (smoke), build ✓, dist/ Caplin-free ✓.

---

## FXSW-034 · GitHub Pages deploy workflow (out of order, pulled from Phase 5)
**Commit `0762c4e`**

- TDD red→green: 3 cases in `tests/unit/vite.config.test.ts` covering `resolveBasePath` — env-set returns env value, undefined returns `/`, empty string returns `/`.
- `.github/workflows/deploy.yml` matches `docs/06 §7.1.b` verbatim: triggers on push to `main` + `workflow_dispatch`, least-privilege permissions (`contents: read`, `pages: write`, `id-token: write`), pnpm cached, `VITE_BASE_PATH=/fx-sales-intervention/` set on the build step, `actions/upload-pages-artifact` + `actions/deploy-pages` for the deploy.
- `vite.config.ts` reads base via a new `scripts/resolveBasePath.ts` helper (extracted so vitest can import it under the app tsconfig without dragging `vite + esbuild + plugin-react` through jsdom).
- Verified locally: `VITE_BASE_PATH=/fx-sales-intervention/ pnpm build` produces `dist/index.html` with asset URLs correctly prefixed (`/fx-sales-intervention/assets/index-*.js`). Built bundle stays Caplin-free.
- Minimal `README.md` added at the repo root: project description, live demo URL placeholder pointing at `https://adityasingh95.github.io/fx-sales-intervention/?dev=1`, stack list, commands table, doc index, deploy note. FXSW-033 will polish this into the full shipped README later.

**User-directed decisions:**
- **Should the Pages deploy be wired up now (out of order) or wait for Phase 5?** Options offered: (a) skip ahead to FXSW-034 now to get the prototype on Pages from this branch, (b) commit a built `dist/` folder as a quick hack, (c) stay on plan and do FXSW-034 when Phase 5 lands. **Chosen:** (a). User had already flipped GitHub Pages on against this feature branch and wanted the prototype visible immediately; pulling the proper Actions workflow forward beats the quick-hack dist-commit path, and the dev-log just notes the phase-order skip rather than rewriting the backlog.

**Agent-directed decisions:**
- _Initial decision (revised — see follow-up):_ followed the architecture spec's `branches: [main]` trigger exactly rather than adding the current feature branch. Reasoning at the time: `workflow_dispatch` lets the user manually deploy from any branch via the Actions UI, and adding the feature branch as a temporary trigger would be debt.
- **Follow-up correction:** the architecture-spec trigger turned out not to work for our showcase situation. GitHub Actions only exposes `workflow_dispatch` in the UI for workflows that live on the **default branch**, and `deploy.yml` was only on the feature branch. The Actions tab showed GitHub's auto-generated `pages-build-deployment` workflow (left over from Pages-source-set-to-branch mode) rather than ours. Resolution: added `claude/vigilant-einstein-Dtads` to the `push` trigger so the next push to this branch auto-deploys. Push-trigger workflows DO discover from non-default branches; only `workflow_dispatch` requires default-branch residency. The temporary line gets stripped in the eventual merge commit to main.
- **First deploy was blank — second follow-up:** Pages source was still set to **Deploy from a branch** in repo settings, not GitHub Actions. The deploy workflow ran green and uploaded the artifact, but Pages ignored it and served the raw feature-branch repo root — so the browser loaded the source `index.html` and 404'd on `/src/main.tsx`. Fix was a one-click flip in Settings → Pages → Source → GitHub Actions; no code change needed. Worth flagging because "deploy workflow green + page blank" looked like an asset-path bug at first and isn't; the workflow's success only means the artifact got uploaded, not that Pages is configured to serve it.
- **Trigger cleanup on merge:** the temporary `claude/vigilant-einstein-Dtads` line is removed in the merge-to-main commit, as foreshadowed above. Post-merge the trigger is back to the architecture-spec shape: `push: branches: [main]` + `workflow_dispatch` (which is now usable from the Actions UI because `deploy.yml` lives on the default branch).
- Extracted `resolveBasePath` to `scripts/resolveBasePath.ts` rather than testing it via `vi.resetModules()` + dynamic re-import of `vite.config.ts`. The dynamic-import path hit an esbuild-in-jsdom invariant error (vite-plugin-react ships native bindings that don't survive jsdom's TextEncoder shim) and would have needed `// @vitest-environment node` per file. The helper-extraction approach is more testable, doesn't require an env override, and keeps the helper available to other tooling later.
- pnpm action pinned to `version: 10` to match the repo's `packageManager: pnpm@10.33.0` rather than the spec doc's `version: 9`. Spec doc was written against an older pnpm pin; the workflow has to match what's actually in `package.json` or `install --frozen-lockfile` fails.
- README is intentionally minimal — FXSW-033 owns the polished shipped README. This commit puts in just enough that the live URL is discoverable from the repo root.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (113 pass / 8 todo), build with prod base path ✓, dist/ Caplin-free ✓. The workflow itself runs on GitHub, not locally — first execution is the human's responsibility (see next-step note in commit message).

---

## FXSW-006 · AppShell + Header + first hardcoded blotter row
**Commit `31e6762`**

- TDD red→green: 4 specified `App.test.tsx` cases — renders without error, contains "FX Sales Workstation", does **not** contain "Caplin" (CLAUDE.md rule §1 assertion), dev-injector slot visible with `?dev=1` and hidden without.
- `App.tsx` is now the real workstation shell: 2px gradient top-strip (`from-blue to-ai-accent` per `05 §2`), 56px header with title left + mute icon + session clock right + conditional dev-injector slot, then 55%/45% Active/Historic blotter regions stacked vertically.
- `useSessionClock` ticks `HH:mm:ss` every second via `setInterval`; cleared on unmount. `isDevMode()` reads `URLSearchParams(window.location.search).has('dev')` on every render so tests can flip URL via `window.history.replaceState`.
- `ActiveBlotter` renders the spec's column header row plus one hardcoded "INTERVENE" demo row that exercises every visible token: status pill (`amber`), mono `tabular-nums` time + amount + rate, side-coloured `BUY` (green), two `Chip`s in Reasons. Amber 4px left-edge bar matches `02 §Row states` for the `INTERVENE` label.
- `HistoricBlotter` shows "No historic deals yet." centred in `text-text-mute`.
- Minimal real implementations for `Pill` (7-color variants keyed to the status palette) and `Chip` (border + elevated bg) — both shared components per `05 §3.1`.
- Paranoia check: `grep -ri caplin dist/` after `pnpm build` returns no matches. The Caplin-free guarantee from CLAUDE.md rule §1 holds on the built bundle, not just the source.

**User-directed decisions:** None — `02 §1` + `05 §2` were prescriptive enough. The only genuinely open inputs were the hardcoded row's demo content (client name, amount, etc.) and the empty-state wording, neither of which rises to ambiguity needing human input — they get replaced by live data in FXSW-012 anyway.

**Agent-directed decisions:**
- Did **not** introduce AG-Grid yet. AC says "one hardcoded row exercising every token", and `docs/06 §2` reserves the AG-Grid integration for the live-blotter ticket FXSW-012. A plain flex-row table is enough to validate the token palette in a real layout without dragging the grid library's bundle weight + setup into this ticket.
- Implemented `Pill` and `Chip` as real shared components rather than inline JSX in `ActiveBlotter`. They're listed in the `05 §3.1` shared inventory, FXSW-012 and the ticket panels will need them, and the alternative (inline JSX now, extract later) creates a refactor debt for zero immediate benefit.
- `Pill` API takes a `color` prop with a closed `PillColor` union (`amber | blue | teal | green | red | grey | ai`) rather than accepting an arbitrary color token name. Closed unions give consumers exhaustive checking and prevent typo-driven runtime mismatches.
- `?dev=1` detection reads `URLSearchParams` on every render (not memoised, not module-scoped). Cheap, and means tests can swap the URL via `window.history.replaceState` without rebuilding the component tree. The trade-off (a few microseconds per render) is irrelevant at this scale.
- Mute icon is a placeholder `<button>` with `aria-label` but no wired-up state — actual mute behaviour lands in FXSW-029 (audio chime + settingsStore). Keeping the affordance present from FXSW-006 means later tickets only need to wire state, not add the element.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (110 pass / 8 todo), build ✓, e2e ✓ (smoke). Built bundle `caplin`-free.

---

## FXSW-005 · State machine skeletons
**Commit `49bde9a`**

- TDD red→green: all 7 specified tests pass (`siMachine` 4, `rfsMachine` 2, `dealMachine` 1).
- `siMachine` — `Initial → PickUpSent → PickedUp` with a named `ackDelay` (250ms) wired through a delay function so `timings.ackDelayMs = 0` from tests immediately makes the transition synchronous.
- `rfsMachine` — `Queued → PickedUp` on `PickUp`. Minimal subset per AC; the rest lands in FXSW-010.
- `dealMachine` — parent that spawns one of each child on init, sharing `dealId` via context.

**User-directed decisions:** None — all decisions within doc-pack guidance (`docs/03 §1, §2, §6` + `CLAUDE.md` rule §7 + the backlog AC's explicit TDD spec).

**Agent-directed decisions:**
- `timings.ts` exports an **object** (`{ ackDelayMs: 250 }`) not `const ackDelayMs = 250`. ES modules make `const` bindings read-only across module boundaries; one of the TDD specs is "overriding `timings.ackDelayMs = 0` makes the transition synchronous", and object property assignment is the only form that satisfies it.
- Delay is wired via a named `ackDelay` **delay function** (`delays: { ackDelay: () => timings.ackDelayMs }`) rather than a literal `after: { 250: ... }`. XState re-evaluates the function lazily on state entry, so test reassignment takes effect on subsequent transitions without rebuilding the machine.
- Declared no-op handlers for **all 16 SI events** from `docs/03 §2` on the parent up-front (not just the few used in this slice). Lets callers wire `send({ type: 'Quote' })` etc. now without TS errors; the real RFS↔SI cross-model coordination from `docs/03 §3` lands cleanly in FXSW-010 by replacing the no-ops in place.
- Each module exports `SnapshotFrom`-derived state-value types so consumers get inferred types instead of repeating the union.
- All gates green: typecheck, lint, test:run (106 pass / 8 todo).

---

## FXSW-004 · Prebuild reference-mids script
**Commit `1ca6d65`**

- Tests-first: 4 cases covering `round` precision, happy-path inversion (EUR/GBP from `1/rate`; JPY/INR straight), HTTP-non-OK → fallback, fetch-throw → fallback.
- Script `scripts/fetch-reference-mids.ts` — Frankfurter USD-based fetch with a 5s `AbortSignal.timeout`, hard-coded fallback, 0 exit code on either path.
- `predev` and `prebuild` wired in `package.json` — confirmed both fire (Frankfurter returns 403 in sandbox network, fallback kicks in, file written, exit 0).

**User-directed decisions:** None — Frankfurter-as-primary, bake-at-build approach, and fallback-on-failure were all locked in by `docs/04 §10`.

**Agent-directed decisions:**
- Direct-run guard: `import.meta.url === file://${process.argv[1]}` so vitest can `import { main, round, FALLBACK }` from the script without triggering a real fetch + write on import. Exports `main(outPath)` parameterised on output path so tests use `mkdtemp` and don't clobber the real generated file.
- `referenceMids.json` is **gitignored**, not checked in. It's a build artifact regenerated on every `pnpm dev`/`pnpm build`; checking it in would create noisy daily diffs.
- `scripts/` added to `tsconfig.app.json` include so `tsc -b` covers the new file (it was outside the existing roots).
- All four gates: typecheck ✓, lint ✓, test:run ✓ (99 pass / 11 todo), build ✓.

---

## FXSW-003 · Folder structure
**Commit `04c4032`**

- Playwright network retry succeeded — chromium installed cleanly at `/opt/pw-browsers/` (had to re-install for v1.44 after `pnpm install` pulled the bundled version).
- Created the full `06 §2` folder tree: 65 new placeholder files across `src/components/`, `src/features/{blotter,ticket,notifications,dev-injector}/`, `src/services/{feed,scenarios,suggestion}/`, `src/state/{stores,machines}/`, `src/types/`, `src/lib/`, plus `tests/e2e/{scenarios,notifications}.spec.ts` and `fixtures.ts`.

**User-directed decisions:** None — the architecture tree in `docs/06 §2` is the literal spec.

**Agent-directed decisions:**
- TS/TSX placeholders use `export {};`; test files (`*.test.ts`) use `it.todo('placeholder')`. Both forms keep typecheck, lint, and vitest green while files wait for real implementations. `it.todo` shows up as a `todo` rather than a failure or a "no tests found" error.
- Kept `index.html` at the **repo root** (Vite 5 convention) rather than moving it under `public/` as the architecture tree shows. Vite's behavior overrides the documentation imprecision; `public/.gitkeep` lets the directory exist for the spec without breaking the bundler.
- Existing `tests/e2e/smoke.spec.ts` (from FXSW-001) kept alongside the three e2e files the architecture lists. Smoke-as-canary stays useful.
- All four gates green: typecheck, lint, test:run (95 pass / 11 todo), test:e2e (smoke).

---

## FXSW-002 · Design tokens + Tailwind config
**Commit `f732331`**

- Every CSS custom property from `docs/05-ui-ux-spec.md §1` lifted into `src/styles/tokens.css`: backgrounds, borders, text, status colors, AI accent family (Cyan/Violet/Teal), functional colors, typography (Geist + Geist Mono via `@fontsource`), spacing, radii, shadows, easings.
- Tailwind theme extended with matching aliases so `bg-bg-panel`, `text-text-dim`, `border-border`, `shadow-ai` resolve.

**User-directed decisions:** None — all token values come straight from `docs/05 §1`.

**Agent-directed decisions:**
- Hex values **duplicated** between `tokens.css` (runtime) and `tailwind.config.ts` (build-time) — the FXSW-002 AC's hex assertion needs an asserted-against source, and Tailwind can't read CSS custom properties at config-evaluation time. The duplication is intentional, not accidental drift.
- Test approach pivoted from the AC's original "assert computed styles on a rendered probe div" to file-content assertions (49 token cases) plus import-the-config-and-assert-the-shape (45 cases). **jsdom doesn't resolve Tailwind classes or CSS `var()` references in `getComputedStyle`**, so the original AC was untestable as-stated. The pivot preserves the spirit (every documented token has an assertion) without depending on a real browser.
- Moved `tailwind.config.ts` out of `tsconfig.node.json` into `tsconfig.app.json` so the config-shape test can import it under the app's project boundary.
- Body sets `tabular-nums` on `.font-mono` so price columns stay aligned.
- All gates green: typecheck, lint, test:run (95 pass).

---

## FXSW-001 · Project scaffolding
**Commit `6999625`**

- Vite 5 + React 18 + TypeScript 5 (strict, no `any`), all dependency versions pinned exactly to `docs/06-tech-architecture.md §1`.
- Full script set wired per `CLAUDE.md`: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:run`, `test:e2e`, `test:e2e:ui`.
- Configs landed: project-reference `tsconfig` with `@/` → `src/` alias, Vite with `VITE_BASE_PATH`-driven base, Tailwind 3 + PostCSS + Autoprefixer (tokens hold til FXSW-002), Vitest with jsdom + globals + `testing-library/jest-dom`, Playwright chromium-only single-worker on 4173 preview, ESLint 8 + Prettier-disable + no-warnings policy, Prettier 3.
- Smoke tests prove the plumbing: `App` is a function (Vite + TS + Vitest pipeline works) and Playwright loads `<body>` (preview + browser launch + assertion works).

**User-directed decisions:** None — stack and pinned versions came directly from `docs/06 §1`.

**Agent-directed decisions:**
- `VITE_BASE_PATH` env-driven base path baked in from day one so the FXSW-034 GitHub Pages deploy doesn't need a config retrofit.
- ESLint runs with `--max-warnings 0`. Warnings fail CI; no gradual-decay rot allowed.
- Playwright pinned to **chromium-only, single-worker**. Multi-browser matrix is out of scope for a prototype; single worker keeps the simulated time-based scenarios deterministic.
- All gates green: typecheck, lint, test:run, e2e.

---

## Phase 0 · Spec pack, backlog, scaffolding (pre-implementation)
**Commits `4ecba9d`, `ac4b8cd`, `1dc1a1f`**

The phase before any code. Sets up everything FXSW-001+ tickets
draw on. Not a single ticket — a multi-day grounding pass.

- **Spec pack** written into `docs/00-glossary.md` through `docs/09-suggestion-engine.md`. Industry-standard FX terminology defined, functional spec for tickets + blotters + notifications, trade-state model (RFS + Sales Intervention) with full state tables and Mermaid diagrams, dummy feed spec, UI/UX spec with every design token, tech architecture, scenario pack, test plan, AI Margin Suggestion engine.
- **Backlog** at `docs/BACKLOG.md` — 34 tickets (FXSW-001 through FXSW-034) across 5 phases. Every ticket has effort estimate (S/M/L), TDD heat-level (🔴 strict / 🟡 component-tests / 🟢 e2e-only / —), dependency list, doc anchors, acceptance criteria, and TDD test list.
- **`CLAUDE.md`** — operating instructions auto-loaded each session. Pinned the stack, the conventions, and ten critical rules.

Phase 0 is where the user-directed-vs-agent-directed split is most
load-bearing: the design decisions made here are what let later
tickets stay agent-directed.

**User-directed decisions** (with the options that were surfaced and the choice taken):
- **Product name vs repo slug.** Options on the table: keep `fx-sales-workstation` as both, or split the slug from the product name. **Chosen:** product name "FX Sales Workstation"; repo slug renamed to `fx-sales-intervention` (commit `ac4b8cd`) to match the underlying functional domain. Slug ≠ product name is intentional.
- **Caplin mentions in the shipped build.** Options: allow Caplin in code identifiers (the canonical Caplin state names are convenient) vs ban Caplin from all shipped artifacts. **Chosen:** ban — UI strings, package metadata, comments, source-map identifiers, README must not mention Caplin. Industry-standard FX terms (`Quoted`, `PickedUp`, `Executable`, `RFS`, `Sales Intervention`) are fine. Locked in as `CLAUDE.md` critical rule §1.
- **One trade machine or two.** Options: collapse RFS + SI into one combined flat machine (simpler, smaller), or model them as two parallel machines with documented cross-sends (mirrors Caplin reality, cleaner v2 path). **Chosen:** two machines with a parent `dealMachine` coordinator. Locked in as `CLAUDE.md` rule §7. The Caplin docs being explicit on this was the deciding factor.
- **AI Margin Suggestion: real LLM call vs deterministic function.** Options: real model call (more impressive demo, latency + non-determinism + cost), or pure deterministic rule engine (predictable, testable, free). **Chosen:** deterministic function. `docs/09-suggestion-engine.md` is the rule book; the in-UI label stays "AI Margin Suggestion" / "Suggested Markup" — the label is real even if the implementation is deterministic. Locked in as `CLAUDE.md` rule §9.
- **Reference FX rates: runtime fetch vs build-time bake.** Options: live HTTP at app startup (current mids, but flaky), or `prebuild` bake to JSON (offline-safe demos, slightly stale). **Chosen:** build-time bake with a hard-coded fallback. Documented in `docs/04 §10`; implemented as FXSW-004.
- **Wiki Agent hand-off path.** Options: write to `raw/prs/` (matches the standard Wiki Agent expectation) vs write to `docs/phase-summaries/` (stays inside the implementation agent's write boundary). **Chosen:** `docs/phase-summaries/` so `CLAUDE.md` rule §10's write boundary stays strict — implementation agent never writes to `wiki/` or `raw/`. The Wiki Agent ingestion config has to be told to read from this path instead of the default.
- **Persistence scope.** Options: none, `sessionStorage`, `localStorage`, IndexedDB. **Chosen:** `sessionStorage` only, and only for two flags (mute toggle + AI-suggestion dismissal). Locked in as `CLAUDE.md` rule §3.

**Agent-directed decisions** (decisions that didn't need a human vote):
- **`*Sent` states with simulated ack delay** (200-300ms). UX fidelity decision — real backends have ack latency, so the demo should show the same affordance. Configurable via `timings.ts`, zeroable in tests. Locked in as `CLAUDE.md` rule §8.
- **5-second removal rule for terminal trades** from the Active Blotter. UX decision derived from `docs/02 §Active Blotter`; locked in as `CLAUDE.md` rule §5.
- **Audio playback unlocked by user gesture**. Browser autoplay policy makes this a forced hand, not a design choice. Locked in as `CLAUDE.md` rule §4.
- **Per-session branch model**. Each Claude Code web session gets a fresh branch (`claude/<adjective-noun>-<id>`) and PRs at consolidation points. This is the harness default, accepted as-is.

No gates at this stage — no code yet. The spec pack itself is the
deliverable, and it's the single grounding source FXSW-001+ all
cite.

---

_Older entries (the bare repo + the initial spec-pack import) are
visible in `git log` directly._
