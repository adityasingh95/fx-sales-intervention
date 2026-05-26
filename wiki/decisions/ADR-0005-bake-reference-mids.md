---
last_updated: 2026-05-26
sources:
  - docs/04-dummy-feed-spec.md
status: stable
---

# ADR-0005 — Bake reference FX mids at build time

**Date:** 2026-05-20 (pre-build)
**Status:** Stable

## Context

The [pricing feed](../components/pricing-feed.md) is a random walk anchored to per-pair reference mids. The mids need to be reasonably current so the demo doesn't open with obviously stale numbers (e.g. EURUSD at last year's rate). The options for sourcing them at runtime are:

1. Live HTTP fetch at app startup — current mids but flaky.
2. Build-time bake to JSON — offline-safe demos, slightly stale.
3. Hard-coded values forever — never current, never breaks.

## Decision

Option 2: build-time bake to JSON via a `prebuild` script, with a hard-coded fallback if the network fetch fails.

## Consequences

**Positive:**
- No runtime network dependency. Demos work offline, no flaky API to break things mid-pitch.
- No API key, no signup, no rate limits to manage.
- Rates stay current as long as the build pipeline runs occasionally. The deploy workflow (FXSW-034) runs the prebuild on every push to `main`, so the live URL always has fresh mids within a day or two of the latest run.
- The random walk simulates intraday movement — daily-resolution source data is sufficient.

**Negative:**
- One more script to maintain. `scripts/fetch-reference-mids.ts` runs as `predev` and `prebuild`.
- If the source API is permanently unreachable, the fallback values become the source of truth. They're versioned in source code, so refreshing them is a manual code change.

## Source

[Frankfurter](https://frankfurter.dev/) — free, open-source FX aggregator across ~80 central banks. No key, no signup. Daily rates updated around 16:00 CET.

## Implementation

- File: `scripts/fetch-reference-mids.ts`. Wired as `predev` and `prebuild` in `package.json`. Uses `tsx`.
- Output: `src/services/feed/referenceMids.json`. Gitignored — it's a build artifact regenerated on every dev / build run; checking it in would create noisy daily diffs.
- Fallback embedded in the script — May 2026 anchor values. The script always writes a valid file: on fetch failure it logs a warning and writes the fallback. Exit code 0 either way so the build never breaks because of a network blip.
- The script is shaped as `main(outPath)` parameterised on output path, with a direct-run guard (`import.meta.url === \`file://${process.argv[1]}\``). Lets Vitest import `{ main, round, FALLBACK }` for unit tests without triggering a real fetch + write on import.
- `scripts/` is included in `tsconfig.app.json` so `tsc -b` covers the new file.

## Alternative sources (if Frankfurter is ever unreachable)

- **ECB direct XML/CSV** — `https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml`. EUR-based, slightly more parsing.
- **`open.er-api.com`** — daily, no key, requires attribution string.
- **Self-hosted Frankfurter** — Docker container in CI if a hosted dependency is unacceptable.

## v2 path

If a future version of the prototype needs **actual live ticks** instead of a synthesized walk, three providers worth evaluating: TraderMade (FX-first, WebSocket, generous free tier), OANDA v20 practice API (highest fidelity), Polygon.io FX (if equities + FX in one app later). All require an API key. Out of scope for v1 — the bake-at-build approach gives 95% of the demo value at 5% of the integration cost.

## Sources

- `docs/04-dummy-feed-spec.md` §10
- `docs/dev-log.md` FXSW-004 — implementation notes
- `docs/BACKLOG.md` FXSW-004 — implementation ticket
