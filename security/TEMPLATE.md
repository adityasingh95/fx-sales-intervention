# Security review — <phase name> (FXSW-<lastTicket>)

> Copy this file to `FXSW-<lastTicket>-review.md` and fill it in. Keep it
> brand-neutral (no vendor names). See `docs/10-security-agent-spec.md`.

## Review metadata

- **Phase:** <e.g. Phase 9 — bid/ask points + v4 gate + Security Agent>
- **Commit reviewed:** <SHA>
- **Branch:** <branch>
- **Date:** <YYYY-MM-DD>
- **Tooling run:** <e.g. pnpm audit, dist inspection>

## Summary

<2–4 sentences: overall posture, count by severity, anything urgent.>

| ID | Track | Severity | Title |
|----|-------|----------|-------|
| F-1 | Functional | Medium | … |
| T-1 | Technical | High | … |

## Findings

### F-1 — <title>

- **Track:** Functional
- **Severity:** <Critical/High/Medium/Low/Info>
- **Evidence:** `path/to/file.ts:NN`
- **Description:** <what the risk is and how it could be triggered>
- **Suggested resolution:** <concrete fix; note any flow/contract it must not break>

### T-1 — <title>

- **Track:** Technical
- **Severity:** <…>
- **Evidence:** `path/to/file.ts:NN`
- **Description:** <…>
- **Suggested resolution:** <…>

## Accepted risk (out of scope this phase)

<Findings not being fixed now, each with a one-line rationale. Triage against the
specs happens here — record the decision, don't silently drop.>

## Proposed resolution work-item

<The backlog ticket(s) recommended for the next phase. Use the same FXSW format
as docs/BACKLOG.md (effort, AC, done-when) so the Build Agent can transcribe
directly. Fixes must preserve canonical state names, the seed-42 golden, and the
GA baseline.>
