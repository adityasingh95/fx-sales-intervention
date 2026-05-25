# Kickoff Prompt for Claude Code

Paste the section between the `===` markers below as your **first message** to Claude Code, with this doc pack already placed under `docs/` at your project root.

The prompt forces a verify-before-build checkpoint, then structures the week as five discrete phases with explicit go/no-go gates.

===

You are taking over a greenfield project: a frontend prototype called **FX Sales Workstation**. The complete specification pack is in `docs/` at the repo root. Your job is to build it over 5 working days with high fidelity to the spec.

**You are one of three agents.** A separate Claude Code session is the Wiki Agent — it maintains `wiki/` and `raw/`, and you must never write to those directories (per `CLAUDE.md` rule §10). The human is the third agent — they approve phase gates and route work between you and the Wiki Agent. Your hand-off to the Wiki Agent is the end-of-phase summary you save to `raw/prs/`.

## Phase 0 — Before writing any code (do this first, then stop)

1. **Read every doc in order.** Start with `CLAUDE.md` (project root), then `docs/README.md`, then `docs/00-glossary.md` through `docs/09-suggestion-engine.md`, then **`docs/BACKLOG.md`** which is your unit-of-work reference for the week. Do not skim. The docs are deliberately cross-referenced; you'll need all of them in working memory.

2. **Reply with a Phase 0 confirmation containing:**
   - One paragraph describing the product in your own words. **No vendor names** anywhere in your description (per CLAUDE.md critical rule §1).
   - The names of the two state machines that run per deal and one concrete example of how they coordinate (e.g. what happens on PickUp).
   - The five scenario IDs from `07-scenario-pack.md`.
   - The folder tree you'll create on day 1, matching `06-tech-architecture.md §2`.
   - The IDs of the six tickets you'll execute in Phase 1 (from `BACKLOG.md`).
   - **Every ambiguity, contradiction, or open question you found**, with your proposed resolution for each. Cite the doc section and ticket ID where relevant. If you found none, say so explicitly — I'll be skeptical.
   - Your sequenced plan for FXSW-001, with rough time estimates.

3. **Stop and wait for my approval.** Do not run any commands, install any packages, or create any files until I reply with "Proceed."

## Phases 1–5 — The week

You'll work in five phases, each composed of a sequence of backlog tickets in `docs/BACKLOG.md`. End each phase with a written summary; do not start the next phase until I say "go."

**For every ticket:**
1. Read the cited doc sections in the ticket header.
2. Write the listed TDD tests **first**. Run them — they should fail.
3. Implement the minimum to turn them green.
4. Refactor if needed.
5. Run the full test suite — everything still green.
6. Commit using the ticket ID: `feat(FXSW-014): ticket panel shell with glass overlay`.
7. Update the ticket's status to `☑` in BACKLOG.md.
8. Move to the next ticket in the phase.

**Phase 1 (Day 1) — Scaffold + first slice.** Tickets FXSW-001 through FXSW-006.

**Phase 2 (Day 2) — Feed + state coordination.** Tickets FXSW-007 through FXSW-013.

**Phase 3 (Day 3) — Ticket panels + actions.** Tickets FXSW-014 through FXSW-021.

**Phase 4 (Day 4) — AI Margin Suggestion.** Tickets FXSW-022 through FXSW-027.

**Phase 5 (Day 5) — Notifications + polish + ship.** Tickets FXSW-028 through FXSW-033.

## Working agreement for the week

- **Plan mode first** for any feature larger than a single component. Produce the plan in chat, wait for approval, then execute.
- **Use your todo tool** to track in-flight work. One item per slice.
- **Atomic commits** with conventional prefixes (`feat:`, `fix:`, `test:`, `chore:`, `style:`). Push after each green slice.
- **No new dependencies** beyond those listed in `06-tech-architecture.md §1` without flagging it first and explaining the need in one sentence.
- **No silent re-interpretation.** If a doc says X and your instinct is Y, stop and ask. Cite the section.
- **No vendor names** in any committed file — UI strings, comments, package.json, README, source-map identifiers. The internal docs reference Caplin URLs as research grounding; nothing else should.
- **No mocked or imagined UI elements.** Every visible thing traces to `05-ui-ux-spec.md` or `02-functional-spec.md`. If a treatment is missing from the docs, ask before improvising.
- **Stop and ask** if: a test is hard to write because the design feels wrong, a doc seems contradictory, you're about to add a workaround, you're about to drop a `data-testid`, or you're tempted to skip a `*Sent` ack delay.

## End-of-phase reply format

When you finish each phase, reply with exactly:

1. **What works** — feature list with commit hashes.
2. **What's rough or open** — anything you'd want a second pass on if there were time.
3. **What surprised you** — design decisions you reconsidered, doc gaps you patched.
4. **Recommended next slice** OR "ready for Phase N+1."

Then save the same content (with a brief frontmatter — date, phase number, ticket range) to `raw/prs/FXSW-{last-ticket-id}-summary.md`. This is the source the **Wiki Agent** (separate session — see `docs/WIKI-SETUP.md`) will ingest. You do not invoke the wiki agent yourself; the human does that in its own session after reviewing your summary.

Then wait for "go."

---

Now read the docs and reply with the Phase 0 confirmation. Do not write any code.

===

## Follow-up prompts for during the week

**Between phases:** `go` (enough once the working agreement is established)

**Vague summary:** `Re-do the summary with specific commit hashes and a concrete list of what's deferred vs done.`

**Design drift:** `That doesn't match 05-ui-ux-spec.md §X — re-read it and fix. Don't argue the change unless you've read the section first.`

**After answering a clarifying question:** `Update the relevant doc section with this decision so the next session inherits it.`

**Scope override:** `New decision overriding 01-prd.md: <change>. Reflect in the PRD and proceed.`

**Flaky tests:** `Stop adding features. Get the existing tests deterministic first — investigate timing, seed, and ack-delay overrides per 08-test-plan.md §3.`

**End of week:** `Produce the final README for the shipped repo. Brand-neutral per CLAUDE.md rule §1. Audience: a new engineer joining the project on Monday.`
