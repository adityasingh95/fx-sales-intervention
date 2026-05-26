---
last_updated: 2026-05-26
sources:
  - docs/02-functional-spec.md
status: in-progress
ticket: FXSW-028
---

# Feature — Notifications

Surfaces a new SI deal to the trader through three simultaneous cues: a row flash in the blotter, a toast in the top-right corner, and a short audible ping (gated by mute).

## Trigger

Fires when a deal first appears in the Active Blotter with `Dealable=true` and SI state = `Initial`. Does **not** re-fire when a previously-picked-up deal is Released back to dealable — only the first appearance counts.

## Visual cues (always fire)

- **Row flash.** Amber 30% → transparent, 300ms fade on the new row.
- **Toast.** Top-right corner, stacked vertically with newest on top. Text: `"New SI request: [Client] wants to [side] [amount] [pair]."` Auto-dismisses at 6s. Click → opens the ticket via `uiStore.openTicket(dealId)`.
- **Title-bar flash.** `document.title` prefixed with `"● "` for 5s, then restored. Helps if the trader is in another tab.

## Audible cue

- Short ping: 180ms, 880 Hz sine with quick decay. Generated via WebAudio API — no asset file, no licensing risk.
- Suppressed when [mute](#mute-toggle) is on.
- **Autoplay unlock:** browsers block audio until first user gesture. The app subscribes to the first `click`/`keydown` event on `document` and calls `audioContext.resume()`. Until then, audible cues silently fail. The mute toggle is the visible affordance that signals audio is supported.

## Mute toggle

- Header icon: `Bell` (unmuted) / `BellOff` (muted) from `lucide-react`.
- Persists to `sessionStorage` key `si.muted`. The only thing persisted across reload in v1.
- Default: unmuted.
- `aria-pressed` reflects state.

## Window blur

Audible notifications still fire. Visual notifications continue. Title-bar flash is particularly useful in this case — the trader sees the `●` in the tab even without focus.

## Test contract

```html
<div data-testid="toast-stack">
  <div data-testid="toast" data-deal-id="d_001">…</div>
</div>
<button data-testid="mute-toggle" aria-pressed="false">…</button>
```

E2E coverage in `tests/e2e/notifications.spec.ts`:
- Mute persists across reload (via `sessionStorage`).
- Muted: visual elements still appear; no `<audio>` plays.
- Unmuted: spy on `AudioContext.prototype.resume` and `OscillatorNode` creation to assert a sound was scheduled.

## Status

Phase 5 work. Toast layer is FXSW-028; audio chime + mute + settingsStore is FXSW-029. Not yet started.

## Sources

- `docs/02-functional-spec.md` §5 — trigger, visual cues, audible cue, mute behavior
- `docs/05-ui-ux-spec.md` §3.4 — component inventory (`ToastStack`, `MuteToggle`, `useNotificationSound`)
- `docs/BACKLOG.md` FXSW-028, FXSW-029
