---
last_updated: 2026-05-26
sources:
  - docs/05-ui-ux-spec.md
status: stable
---

# ADR-0008 — Indigo-violet accent reserved exclusively for AI surfaces

**Date:** 2026-05-20 (pre-build)
**Status:** Stable

## Context

The prototype's design language is "modern dark trading-app" — refined typography, considered spacing, subtle motion. Status colors (amber, blue, teal, green, red, grey) cover the trading-chrome palette. The [AI Margin Suggestion panel](../features/ai-margin-suggestion.md) is the visual moment-of-delight in the ticket and needs to be distinct from the trading chrome — recognisable as the "AI" surface without being garish.

Three obvious options for the AI accent:

1. **Reuse an existing status color** (e.g. blue or teal). Cheaper palette, less visual noise.
2. **Add a distinct accent family** dedicated to AI surfaces. More tokens, more discipline required, more recognisability.
3. **Use a gradient.** Common in 2024-2026 fintech AI features.

## Decision

Option 2: a distinct **indigo-violet** accent family, used **only** on the AI Margin Suggestion panel, the sparkle icon, and the 2px header gradient strip. Nothing else in the UI uses these tokens.

## Token definitions

```css
--color-ai-accent:     #818cf8;      /* primary indigo */
--color-ai-accent-2:   #a78bfa;      /* gradient companion */
--color-ai-bg:         rgba(99, 102, 241, 0.08);   /* subtle wash */
--color-ai-border:     rgba(129, 140, 248, 0.22);
--shadow-ai:           0 0 0 1px var(--color-ai-border),
                       0 1px 24px -4px rgba(99, 102, 241, 0.12);  /* subtle indigo glow */
```

Header accent strip uses both: `linear-gradient(90deg, --color-blue 0%, --color-ai-accent 100%)` — a 2px bar at the very top of the workstation, the only place outside the AI panel that hints at the AI/automation theme.

## Consequences

**Positive:**
- Instant recognisability. Anywhere a trader sees the indigo wash + sparkle, it's an AI surface. Mental model is "this is the AI panel" not "is this clickable / a status / a notification".
- The discipline of "reserved exclusively for AI" makes the indigo a meaningful visual cue rather than chrome decoration. If the AI is right, the indigo earns trust. If the AI is wrong, the indigo doesn't undermine the rest of the UI.
- Confident, modern — indigo-violet is the 2024-2026 fintech AI accent of choice (used in similar surfaces across the trading-tools space) without being garish.

**Negative:**
- More tokens to maintain. The discipline of "don't reuse indigo for anything else" is a soft rule enforced by code review, not the type system.
- One additional palette for color-blindness testing to verify.

## Enforcement

The design tokens are declared in `src/styles/tokens.css` with comments marking them AI-only. Any other component reaching for `--color-ai-*` is a code-review-level violation. There is no automated lint for this (TBD whether worth adding a Stylelint rule for `--color-ai-*` outside `SuggestionPanel.tsx`).

## Sources

- `docs/05-ui-ux-spec.md` §1, §4.5, §10 — token definitions, AI panel layout, what to avoid
