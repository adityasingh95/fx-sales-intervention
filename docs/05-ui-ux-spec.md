# 05 — UI/UX Specification

The look and feel target is **modern dark trading-app**. Think contemporary fintech tools — Talos, ION Anvil, the new Robinhood Pro — not the dense lo-fi Bloomberg-Terminal aesthetic. Still dark, still dense enough for a trader's eye, still professional, but with refined typography, considered spacing, subtle motion, and confident colour. No "consumer SaaS" tropes either: no big hero text, no pastel cards, no oversized rounded corners, no playful illustrations.

The AI Margin Suggestion panel is the visual moment-of-delight in the ticket — distinct from the trading chrome via a subtle indigo accent and a sparkle motif, while still feeling part of the workstation.

## 1. Design tokens

All tokens live in `/src/styles/tokens.css` as CSS custom properties and are mirrored in `tailwind.config.ts` as theme extensions. Tailwind classes use the token names (`bg-bg-panel` not `bg-[#1a1f2c]`).

### Colors — dark theme (default and only)

```css
:root {
  /* Backgrounds — deeper, more refined than utilitarian "trader dark" */
  --color-bg-app:        #0a0a0f;
  --color-bg-panel:      #111118;
  --color-bg-panel-2:    #16161f;
  --color-bg-elevated:   #1c1c27;
  --color-bg-row-hover:  #1f1f2b;
  --color-bg-overlay:    rgba(6, 6, 10, 0.72);
  --color-bg-glass:      rgba(22, 22, 31, 0.78);  /* used with backdrop-filter blur(20px) */

  /* Borders & dividers — refined for subtle elevation */
  --color-border:        #23232f;
  --color-border-strong: #2e2e3d;
  --color-border-focus:  #6366f1;

  /* Text — slightly cooler than before */
  --color-text:          #f1f1f5;
  --color-text-dim:      #a1a1ab;
  --color-text-mute:     #62626f;

  /* Status colors — slightly desaturated for sophistication */
  --color-amber:         #fbbf24;      /* PENDING_INTERVENTION */
  --color-blue-soft:     #7aa7ff;      /* PICKED UP */
  --color-blue:          #3b82f6;      /* PICKING UP / focus accent */
  --color-teal:          #14c4a8;      /* STREAMING */
  --color-teal-dim:      #2e8073;      /* QUOTED */
  --color-green:         #22c55e;      /* DONE / BUY */
  --color-red:           #ef4444;      /* REJECTED / SELL */
  --color-grey-500:      #62626f;
  --color-grey-700:      #3e3e4d;

  /* AI panel — distinct family, indigo-violet */
  --color-ai-accent:     #818cf8;      /* primary indigo */
  --color-ai-accent-2:   #a78bfa;      /* gradient companion */
  --color-ai-bg:         rgba(99, 102, 241, 0.08);   /* subtle wash */
  --color-ai-border:     rgba(129, 140, 248, 0.22);

  /* Functional */
  --color-tick-up:       #22c55e;
  --color-tick-down:     #ef4444;
  --color-focus-ring:    #6366f1;
}
```

The AI-accent indigo/violet family is reserved for the suggestion panel and the sparkle icon. Nothing else in the UI uses it — keeps the "AI" visual cue distinct.

### Typography

```css
/* Geist is Vercel's open-source modern UI typeface — feels precisely 2026 without being trendy.
   Inter is the safe fallback. */
--font-sans:  "Geist", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
--font-mono:  "Geist Mono", "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;

--text-xs:    11px;   /* metadata, timestamps */
--text-sm:    12px;   /* default blotter text */
--text-base:  13px;   /* default body, ticket labels */
--text-md:    14px;   /* ticket section titles */
--text-lg:    18px;   /* trader rate display */
--text-xl:    26px;   /* bid/ask big boxes */
--text-2xl:   32px;   /* AI suggestion number */

--line-tight: 1.2;
--line-base:  1.45;

--tracking-tight: -0.01em;   /* numerals look more confident slightly tightened */
```

**Mono is for numbers only.** Prices, amounts, pip counts, dealId — all mono. Everything else sans.

Tabular numerals everywhere prices/amounts appear: `font-variant-numeric: tabular-nums`.

Headings use `letter-spacing: -0.01em` for a more modern, settled feel.

### Spacing

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
```

Slightly more generous spacing than a pure Bloomberg-style layout — gives the modern aesthetic room to breathe while still being information-dense.

### Radii

```css
--radius-sm: 4px;   /* pills, chips */
--radius-md: 6px;   /* buttons, inputs */
--radius-lg: 10px;  /* panels */
--radius-xl: 14px;  /* ticket overlay corners, AI panel */
```

Slightly larger than the previous bracket (which was 2–6px). Modern but never consumer-app rounded.

### Shadows & elevation

Modern trading UIs use depth sparingly. Three levels:

```css
--shadow-panel:  0 0 0 1px var(--color-border);
--shadow-ticket: 0 0 0 1px var(--color-border-strong),
                 -16px 0 48px -8px rgba(0, 0, 0, 0.5);
--shadow-ai:     0 0 0 1px var(--color-ai-border),
                 0 1px 24px -4px rgba(99, 102, 241, 0.12);  /* subtle indigo glow */
```

The ticket overlay also applies `backdrop-filter: blur(20px) saturate(140%)` over a translucent panel background (`--color-bg-glass`) — a real glass effect, not a fake gradient.

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER (56px) — subtle gradient bar at very top (2px) for accent     │
│ FX Sales Workstation              [Dev injector] · 🔔 · 14:23:08     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ACTIVE DEALS BLOTTER (55% of remaining)                             │
│  ┌───┬────┬──────┬──────┬─────┬────┬────────┬─────┬────┬─────────┐   │
│  │Sta│Time│Client│Acct  │Pair │Side│Amount  │Tenor│Rate│Reasons  │   │
│  └───┴────┴──────┴──────┴─────┴────┴────────┴─────┴────┴─────────┘   │
│  rows…                                                               │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  HISTORIC DEALS BLOTTER (45%)                                        │
│  rows…                                                               │
└──────────────────────────────────────────────────────────────────────┘

When a ticket is open:
                                                       ┌───────────────┐
                                                       │ TICKET (640px │
   (blotters dimmed 25%, backdrop-blurred)             │  overlay,     │
                                                       │  glass surface│
                                                       │  + indigo     │
                                                       │  edge glow on │
                                                       │  AI panel)    │
                                                       │               │
                                                       │ Reasons       │
                                                       │ Summary       │
                                                       │ AI Suggestion │ ◄ indigo accent
                                                       │ Pricing       │
                                                       │ Client        │
                                                       │ Deal          │
                                                       │ Footer        │
                                                       └───────────────┘
```

The ticket slides in from the right (240ms `cubic-bezier(0.16, 1, 0.3, 1)` for `transform: translateX`, with `backdrop-filter` fade-in over 180ms). Clicking outside the ticket area or pressing Esc slides it back out.

A 2px gradient bar (`linear-gradient(90deg, --color-blue 0%, --color-ai-accent 100%)`) runs along the very top edge of the header — the only visual moment that hints at the AI/automation theme outside of the suggestion panel itself.

## 3. Components

Component inventory and the file each lives in. Build only what's listed — don't pre-emptively create kits.

### 3.1 Shared (`/src/components/`)
- `Button.tsx` — variants: `primary`, `secondary`, `ghost`, `danger`. Sizes: `sm`, `md`. Supports `holdToConfirm` prop for terminal actions.
- `IconButton.tsx` — square, sized by base font.
- `Pill.tsx` — colored small label, used for status. Accepts color token name.
- `Chip.tsx` — for rejection reasons in the Reasons Panel.
- `NumberInput.tsx` — for margin entry. Increments via +/− buttons, accepts integer keystrokes.
- `Tooltip.tsx` — minimal, dark background, no animation longer than 80ms.
- `Toast.tsx` — toast component (manager lives in features/notifications).

### 3.2 Blotter (`/src/features/blotter/`)
- `ActiveBlotter.tsx` — wraps AG-Grid with active deals data.
- `HistoricBlotter.tsx` — wraps AG-Grid with historic data.
- `StatusCell.tsx` — renders a `Pill` based on status, used as AG-Grid cellRenderer.
- `RateCell.tsx` — renders a live-updating rate with brief flash on change.
- `AmountCell.tsx` — formatted amount with currency suffix.
- `ReasonsCell.tsx` — chips for the rejection reasons.

### 3.3 Ticket (`/src/features/ticket/`)
- `TicketPanel.tsx` — the right-overlay container, handles open/close transitions and glass effect.
- `ReasonsPanel.tsx`
- `SummaryPanel.tsx`
- `SuggestionPanel.tsx` — the AI Margin Suggestion section. Indigo-accented; see §4.5.
- `PricingPanel.tsx` — the most complex component; handles streaming/fixed mode toggle, margin controls.
- `ClientSummaryPanel.tsx`
- `DealSummaryPanel.tsx`
- `TicketFooter.tsx` — the five-button action bar with hold-to-confirm wiring.

### 3.4 Notifications (`/src/features/notifications/`)
- `ToastStack.tsx`
- `useNotificationSound.ts` — WebAudio hook + audio-unlock on first user gesture.
- `MuteToggle.tsx` — header icon button.

### 3.5 Dev Injector (`/src/features/dev-injector/`)
- `DevInjector.tsx` — visible only when `?dev=1`. Buttons enumerated from the scenario registry.

## 4. Component visual specifications

### 4.5 AI Suggestion Panel

The visual moment of the ticket. Distinct from the pricing chrome via the indigo accent family, the sparkle motif, and a subtle indigo glow. Otherwise it sits inside the ticket's standard panel grid.

Sketch (ready state):

```
┌───────────────────────────────────────────────────────────────┐
│ ✦  AI Margin Suggestion           [High confidence]    ⟳     │
│ ─────────────────────────────────────────────────────────────│
│                                                               │
│      4 pips                                                   │
│                                                               │
│  Gold-tier client with 12M EURUSD above auto-pricer band      │
│  — suggesting 4 pips.                                         │
│                                                               │
│  ┌──────────┐  ┌────────┐                                     │
│  │  Apply   │  │ Why?   │                                     │
│  └──────────┘  └────────┘                                     │
└───────────────────────────────────────────────────────────────┘
```

Sketch (applied/collapsed state):

```
┌───────────────────────────────────────────────────────────────┐
│ ✦  Applied 4 pips                                  [Undo]    │
└───────────────────────────────────────────────────────────────┘
```

Sketch (credit-decline state, §7 in `09-suggestion-engine.md`):

```
┌───────────────────────────────────────────────────────────────┐
│ ✦  AI Recommendation                              ⚠           │
│ ─────────────────────────────────────────────────────────────│
│                                                               │
│  Credit limit breach — recommend declining.                   │
│                                                               │
│  ┌──────────────────┐                                         │
│  │  Reject deal     │                                         │
│  └──────────────────┘                                         │
└───────────────────────────────────────────────────────────────┘
```

Visual specs:

- Background: `--color-ai-bg` (subtle indigo wash, 8% opacity) over the panel.
- Border: 1px `--color-ai-border`.
- Top-left icon: `Sparkles` from `lucide-react`, `--color-ai-accent`, 16px.
- Suggested-pips number: `--text-2xl` (32px), `--font-mono`, `--color-text`, semi-bold weight.
- Rationale: `--text-base`, `--color-text-dim`, `--line-base`.
- Confidence badge: small pill, top-right; colors:
  - High: `--color-ai-accent` text, `--color-ai-bg` background.
  - Medium: `--color-text-dim` text, `--color-bg-elevated` background.
  - Low: `--color-amber` text, transparent background, dotted border.
- Recompute icon (`RotateCw`): 14px, `--color-text-mute`, becomes `--color-ai-accent` on hover.
- Apply button: primary CTA style, `--color-ai-accent` background, `--color-bg-app` text.
- "Why?" button: `ghost` variant.
- Box-shadow: `--shadow-ai` for the subtle indigo glow.

"Why?" expanded state inserts a small table between the rationale and the buttons:

```
┌───────────────────────────────────────────────────────────────┐
│ Factor              Δ pips   Note                              │
│ ─────────────────────────────────────────────────────────────│
│ Client tier         baseline gold = 2 pips                     │
│ Notional size       +1.5     10–20M USD-equivalent             │
│ Size band breach    +0.5     Above auto-pricer band            │
└───────────────────────────────────────────────────────────────┘
```

Computed state (during the 800ms debounce after a recompute trigger): the suggested-pips number is replaced with a shimmer skeleton (`--color-bg-elevated`, 1.2s shimmer loop). The rationale shows "Recomputing…" in `--color-text-mute`. Apply is disabled.

## 4. Pricing Panel detail

The most interaction-heavy component. Sketch:

```
┌───────────────────────────────────────────────────────────────┐
│ Trader Rate                                                   │
│                                                               │
│  ┌─────────────┐    1.08500    ┌─────────────┐    [Refresh]   │
│  │  1.08495    │  ← mid (dim)  │  1.08505    │  (fixed only)  │
│  │  BID        │               │  ASK        │                │
│  └─────────────┘               └─────────────┘                │
│       (live, mono, 26px)            (live, mono, 26px)        │
│                                                               │
│ Margin                                                        │
│  [ − ]   ┌────────┐   [ + ]                                   │
│          │   3    │  pips                                     │
│          └────────┘                                           │
└───────────────────────────────────────────────────────────────┘
```

- Bid/Ask boxes are click targets. Click → enters fixed mode for that side. The clicked box gets a `--color-border-focus` outline.
- Mid is small, dimmed, between the two big boxes.
- Margin controls: − and + buttons each 32×32px, large hit target.
- When Apply fires on the AI panel, the margin field animates from current → suggested over 200ms with a brief `--color-ai-accent` outline glow that fades over 600ms.
- Keyboard `+` / `-` while the panel is focused has the same effect as the buttons.
- On a live tick: the bid or ask cell briefly flashes (80ms `--color-tick-up` or `--color-tick-down` border) depending on direction vs the previous value.

## 5. Animation budget

Trading UIs that animate too much feel slow. Strict budget — fast, restrained, with one signature easing:

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);   /* primary easing — confident exits */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);  /* gentler — used for hovers */
```

| Animation | Duration | Easing |
|---|---|---|
| Ticket slide in/out | 240ms | `--ease-out-expo` |
| Ticket glass blur fade-in | 180ms | `--ease-out-quart` |
| Row flash on new SI deal | 320ms | `--ease-out-expo`, single shot |
| Rate cell tick flash | 80ms | linear |
| Toast slide in | 200ms | `--ease-out-expo` |
| Toast slide out | 160ms | `--ease-out-quart` |
| Hover backgrounds | 100ms | linear |
| Status pill color change | 0ms | (instant — the state matters) |
| Margin field on AI Apply | 200ms | `--ease-out-expo`, with 600ms glow fade |
| AI panel "Recomputing" shimmer | 1.2s loop | linear |
| AI panel collapse to applied state | 220ms | `--ease-out-expo` |

No spring physics. No staggered choreography. No skeleton loaders elsewhere (other state is always instantaneous in this app).

## 6. Iconography

- `lucide-react` only. No emoji.
- Used: `Bell`, `BellOff`, `X` (close), `RefreshCw` (refresh rate), `RotateCw` (recompute AI), `Sparkles` (AI panel header), `Plus`, `Minus`, `Send`, `Pause`, `RotateCcw` (return to stream), `AlertTriangle` (reasons), `Clock`, `Undo2` (undo applied suggestion).
- Icon size matches surrounding text size (12px / 14px / 16px).

## 7. Accessibility

- All buttons have visible focus rings (`outline: 2px solid var(--color-focus-ring)`).
- `Esc` closes the ticket panel.
- AG-Grid keyboard navigation enabled.
- Color is never the sole indicator of state — every colored pill has a text label.
- Color contrast: every text token on every background token meets WCAG AA (≥4.5:1) — verified during the polish day.
- Hold-to-confirm buttons announce "Hold to confirm" via `aria-describedby`.
- Mute toggle has `aria-pressed`.

## 8. Empty / loading / error states

- **Empty Active**: "No active deals. Use the dev injector to start a scenario." centered, dimmed text.
- **Empty Historic**: "No historic deals yet." centered, dimmed.
- **Feed stale (>3s no tick on a pair)**: Bid/Ask cells show "—" in `--color-text-mute`.
- **Initial app load**: instant — no loaders. State is in-memory.

## 9. Browser zoom and resolution

Optimised for 1440×900 and up (the full layout fits without horizontal scroll). Below 1440px the layout stays usable via horizontal scroll:

- The header's dev-injector strip becomes a horizontally-scrollable region; mute toggle and clock stay pinned to the right.
- Each blotter (Active + Historic) wraps its column-header row and body in a single horizontally-scrollable container at `min-w-[1100px]` / `min-w-[920px]` respectively. Column headers stick to the top, rows stay aligned.
- Title and clock font sizes step down one tier below the Tailwind `sm:` breakpoint (640px).

Card-stacked mobile redesign (each row as a tap-to-expand card with key fields above the fold) is explicitly out — the horizontal-scroll pattern preserves the trader-blotter aesthetic and keeps one layout in the codebase. See `dev-log.md` "Mobile/responsive layout" entry for the decision trail.

## 10. Things explicitly to avoid

- Card stacking with shadows everywhere — depth from borders + the single glass moment on the ticket only.
- Heavy gradients across the whole UI — only the 2px header accent and the AI panel's subtle wash.
- Default button colors (everything is a token).
- Rounded corners > 14px.
- Toast notifications longer than 6s.
- Pop-up confirmation modals (use hold-to-confirm instead).
- More than one font family beyond `--font-sans` and `--font-mono`.
- Any third-party UI kit (Material UI, Chakra, Mantine, Ant Design) — Tailwind + the components inventoried in §3 is sufficient.
- Marketing-app language anywhere. The app is for professionals; the copy should be clipped and confident.
- Vendor names in any user-visible string (see CLAUDE.md critical rule §1).
