---
last_updated: 2026-05-26
sources:
  - docs/02-functional-spec.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/FXSW-033-summary.md
status: stable
ticket: FXSW-028..FXSW-029
---

# Feature — Notifications

Surfaces a new SI deal to the trader through four simultaneous cues: a row flash in the blotter, a toast in the top-right corner, a `●` prefix on the document title, and a short 880 Hz chime (gated by the mute toggle + a one-time audio unlock per `docs/02-functional-spec.md` §5.3 autoplay policy).

## Trigger

Fires when a deal first appears in the Active Blotter with:

- `siState === 'Initial'`
- `dealable === true`
- `rejectionReasons.length > 0` (i.e. SI channel, not ESP)
- `dealId` not in the dispatcher's `notifiedDealIds` set

**Does not re-fire** when a previously-picked-up deal is Released back to dealable. The dispatcher's `notifiedDealIds: Set<string>` enforces this — the FXSW-028 implementation uses `markNotified` + `hasNotified` so the gate is explicit per-iteration, not implicit.

ESP deals never fire notifications — they have `rejectionReasons === []` by construction.

## Visual cues (always fire)

### Row flash (300ms)
ActiveBlotter row gets `data-row-flash="new"` + `animate-row-flash` class. The `row-flash` keyframe in `src/styles/global.css` runs an amber-30% → transparent fade over 300ms with `forwards` fill. CSS-only — no JS timer.

### Toast (6s auto-dismiss)
- Top-right `fixed` stack, AI-bordered + glass background, 320px wide.
- Each card: `data-testid="toast-{dealId}"` (dynamic). Outer card is a `<button>`.
- **Click anywhere on the card** → opens the ticket via `uiStore.openTicket(dealId)` AND dismisses the toast.
- **Click the `X`** → dismisses without opening. Inline `<span role="button">` with `stopPropagation` (nested `<button>` inside `<button>` is invalid HTML).

### Title flash (5s)
`flashDocumentTitle()` prefixes `document.title` with `● ` for 5s, then restores. Idempotent — concurrent triggers reset the 5s timer without compounding the prefix. Test-only `_resetTitleFlash` helper exported for cleanup.

## Audible cue

180ms 880 Hz sine via WebAudio API. No asset file (no licensing risk).

- **Mute gate** happens in the hook, not in `playChime()`. The play function is muted-agnostic — useful if a future ticket adds a "test sound" affordance in a settings panel.
- **Autoplay unlock** — browsers reject `new AudioContext()` before a user gesture. The hook installs `click` + `keydown` listeners on `document` and creates the context on first event. Touch events fire `click` on iOS in the prototype's desktop-first scope, so no separate touch listener.
- **One chime per new SI deal**, not per render. The hook subscribes to `notificationsStore.notifiedDealIds.size` — comparing sizes is `O(1)` and uniquely identifies "a new deal has been notified" because the dispatcher only ever adds, never removes.
- **AudioContext is module-scoped, lazy, and replaceable** via `_audio.setFactory(...)` (test-only). Singleton per session keeps WebAudio resources controlled; production never touches `_audio`.

## Mute toggle

- Header button: `Bell` (unmuted) / `BellOff` (muted) from `lucide-react`.
- `aria-pressed`, `data-muted`, dynamic `aria-label` ("Mute notifications" / "Unmute notifications").
- Replaced the FXSW-006 placeholder `Volume2` icon.

Persists to `sessionStorage` key `si.muted` via the [settings store](../components/) (`src/state/stores/settingsStore.ts`). Safari-private-mode tolerant (try/catch around storage calls). Reads on init; writes on every mutation. Default: unmuted.

## Architecture

```
dealsStore subscription
       │
       ▼
dispatchNotifications(deals)
       │  iterate over deals; if SI-channel + Initial + dealable + not-notified:
       ├──► notificationsStore.addToast({ dealId, ... })       ──► <ToastStack />
       ├──► flashDocumentTitle()                                ──► document.title = '● ' + title
       └──► notificationsStore.markNotified(dealId)
                                                                 ▲
useNotificationSound()  ────────────────────────────────────────┘
   │ subscribes to notifiedDealIds.size
   │ on growth + unmuted + audio-unlocked → playChime()

ActiveBlotter row mount  ───►  data-row-flash="new" + animate-row-flash
                                (CSS keyframe, 300ms, no JS)
```

Wired in `main.tsx` via `wireNotifications()` alongside `wireDealFeedToStore()` — all cross-system glue in one place.

## Window blur

Audible cues still fire; visual cues continue. The title flash (`●` in the tab) is particularly useful when the trader is in another tab.

## Test contract

```html
<div data-testid="toast-stack">
  <button data-testid="toast-{dealId}">…</button>
</div>

<button data-testid="mute-toggle" data-muted="false" aria-pressed="false">…</button>
```

## Tests

| File | Cases | Covers |
|---|---|---|
| `src/state/stores/notificationsStore.test.ts` | Implicit via consumers | Toast list + notified-set storage |
| `src/state/stores/settingsStore.test.ts` | **5** | Default unmuted; toggleMute flips; persists to sessionStorage; setMuted writes; reload restores via fresh module import. |
| `src/features/notifications/titleFlash.test.ts` | **2** | Prefix + restore at 5s; repeated calls reset timer without double-prefixing. |
| `src/features/notifications/ToastStack.test.tsx` | **6** | Toast appears on fresh SI deal; auto-dismiss at 6s; card click opens ticket + dismisses; `X` dismisses without opening; re-Release does NOT re-fire; ESP deals don't trigger; dispatcher also fires the title flash. |
| `src/features/notifications/MuteToggle.test.tsx` | **3** | Bell ↔ BellOff icons + `aria-pressed` + `data-muted` toggle; click flips state + persists. |
| `src/features/notifications/useNotificationSound.test.tsx` | **4** | No schedule before audio unlock; schedules 880Hz OscillatorNode after unlock + new SI deal + unmuted; no schedule when muted; one oscillator per new deal, not per render. |

E2E coverage: all three SI scenarios ([off-hours-intervention](../scenarios/off-hours-intervention.md), [credit-breach](../scenarios/credit-breach.md), [size-limit-margin-tune](../scenarios/size-limit-margin-tune.md)) now assert `getByTestId('toast-{dealId}')` visibility + `expect.poll(page.title()).toMatch(/^●\s/)`. The FXSW-028-deferred markers those specs carried since Phase 3 are gone.

Test patterns at play: see [test-patterns.md](../components/test-patterns.md) §1 (seed pinning isn't relevant here), §10 (`data-*` over text/color), §11 (idempotent setup/teardown).

## Known interim

- **No "muted" affordance on the row flash itself.** A trader who muted earlier still gets the row flash + toast + title flash — only the chime is suppressed.
- **AudioContext isn't released on app unmount.** Singleton lives for the session — harmless in a prototype, would matter in a long-running multi-tab production app.
- **`act()` warnings in test output** persist (XState child-actor subscriptions firing outside React's `act()` scope, plus the new Harness components in the FXSW-029 tests). Tests pass, CI gates green; not worth blocking on.

## Implementation commits

| Ticket | Commit | What |
|---|---|---|
| FXSW-028 | `227c96f` | Visual layer — `notificationsStore`, `dispatcher`, `titleFlash`, `ToastStack`, row-flash keyframe, dispatcher subscription. All three SI E2Es now assert toast + title. |
| FXSW-029 | `5343219` | Audio chime — `settingsStore`, `useNotificationSound` with lazy WebAudio + factory injection, `MuteToggle` Bell/BellOff icon. |

## Sources

- `docs/02-functional-spec.md` §5 — trigger, visual cues, audible cue, mute behaviour
- `docs/05-ui-ux-spec.md` §3.4 — component inventory
- `docs/phase-summaries/FXSW-033-summary.md`
- `docs/dev-log.md` FXSW-028, FXSW-029 — implementation notes
