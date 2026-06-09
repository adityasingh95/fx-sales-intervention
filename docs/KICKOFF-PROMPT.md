# Kickoff Prompt for Claude Code

Use this prompt at the start of a new Claude Code session for the FX Sales Workstation prototype.

---

We are building **FX Sales Workstation**, a brand-neutral frontend prototype for FX sales manual-pricing intervention.

Read these first:

1. `CLAUDE.md`
2. `docs/README.md`
3. `docs/00-glossary.md`
4. `docs/BACKLOG.md`

Then identify the next unchecked ticket in `docs/BACKLOG.md` and implement it using the referenced docs.

Hard constraints:

- Do not add vendor names anywhere in committed files or generated output.
- Keep the product name as **FX Sales Workstation**.
- Use only simulated feeds; no runtime external pricing calls.
- Keep RFS and Sales Intervention state models separate.
- Preserve canonical state/event names and test ids unless the backlog explicitly says otherwise.
- Update tests alongside implementation.
- Run typecheck, lint, unit tests, E2E tests, and build where relevant.
- Append a concise `docs/dev-log.md` entry after each implementation ticket.
- Do not write to `wiki/` or `raw/` unless explicitly instructed.

When a requirement is ambiguous, stop and ask. When you make an implementation decision, record whether it was user-directed or agent-directed in the dev log.

## Phase 6 — branch + version gate

Phases 1–5 shipped on `main`. Phase 6 (FXSW-035 → FXSW-042) lives on the long-lived `dev/v2` branch and ships behind the `?dev=v2` URL gate. `main` is **not** to be touched by Phase 6 tickets. Build agents picking up Phase 6 work:

- Start from `dev/v2` (branch from `origin/main` if not yet present locally).
- Land each ticket on `dev/v2` directly (no separate per-ticket branches).
- Preserve every v1 path; gate new behaviour on `devVersion === 'v2'` from `src/lib/devVersion.ts`.
- Tests assert both that `?dev=v2` enables the new behaviour AND that no-query / `?dev=1` produces the v1 baseline byte-for-byte.
- The end-of-phase summary file is `docs/phase-summaries/FXSW-042-summary.md`.

Promotion of `dev/v2` to `main` is a separate decision and a separate phase.
