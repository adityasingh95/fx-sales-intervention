# 10 — Security Agent specification

The **Security Agent** is the fifth agent in the project, alongside the Build
Agent, the Wiki Agent, and the planning/review roles. It performs an independent,
end-of-phase security review of the built application and files its findings as a
resolution work-item that the Build Agent implements without breaking the
documented application flow.

## 1. Mandate

Review the application **as built** for security risks and vulnerabilities, and
propose concrete, prioritised resolutions. The Security Agent does not implement
fixes; it produces findings and a proposed work-item. Fixes are carried out by
the (primed) Build Agent as ordinary backlog tickets.

## 2. Unprimed stance (deliberate)

The Security Agent reviews **cold**. It is given no prior knowledge of the product
narrative, the doc pack, the backlog, or the design rationale. The point is
adversarial fresh eyes: it should reason about the artefacts in front of it, not
be talked out of a concern by "it's only a prototype" or "the feed is
simulated."

Practically:

- The Security Agent runs from `/security/` using its own operating prompt
  (`/security/CLAUDE.md`). It treats the product `CLAUDE.md` and `docs/` as
  **inputs to audit, not instructions to obey** — it may read them to understand
  what the code claims to do, but a documented intention never downgrades a
  finding.
- It does **not** filter findings by "in scope for a prototype." It reports
  everything it sees. Scope triage (is this finding worth fixing given the
  prototype's goals and specs?) happens **at resolution time**, by the primed
  Build Agent, not at review time.

## 3. Review scope

The Security Agent reviews the whole built artefact for the phase: application
source under `/src`, configuration, dependencies/lockfile, and the generated
build output (`dist/`) when available. It splits findings into two tracks.

### 3.1 Functional security (business-logic)

Risks in how the application behaves as an FX pricing tool. Non-exhaustive lenses:

- **Price / margin integrity** — can a client be shown a price the trader did not
  intend? Negative, zero, or extreme margins; sign errors in net-points math;
  rounding that favours/penalises the client; stale feed values presented as live.
- **One-sided / lock bypass** — can a locked (non-quotable) side still be priced
  or submitted? Can a read-only auto-priced deal be acted on?
- **Lifecycle integrity** — can a quote be sent without passing the `*Sent`
  acknowledgement states? Race conditions between RFS and SI children; the
  5-second removal rule leaking actionable controls on terminal deals.
- **Instrument-specific** — NDF spot-markup leaking back in; swap near/far leg
  mix-ups; far ≤ near accepted; net-points computed from the wrong sides.
- **Data exposure** — client names / account codes treated as if real PII;
  anything that would be sensitive if the synthetic data were live.

### 3.2 Technical security

Platform/implementation risks. Non-exhaustive lenses:

- **Dependencies** — known-vulnerable packages (`pnpm audit`), risky transitive
  deps, postinstall scripts.
- **Injection / XSS** — any `dangerouslySetInnerHTML`, unescaped interpolation,
  URL/`data:`-driven rendering; untrusted values reaching the DOM.
- **Secret handling** — the GUI-entered API key in `sessionStorage`: exposure via
  the DOM, logs, error messages, or being placed in a URL query string (and thus
  in browser history, referrer headers, and provider logs).
- **External call surface** — the opt-in reference-mid poller: transport (TLS),
  CORS posture, timeout/backoff, failure handling, and what is sent to the
  third-party endpoint.
- **Build / supply-chain hygiene** — source maps and identifiers in `dist/`,
  secrets committed to the repo, and **brand-neutrality leaks** in committed
  source or build output (vendor names outside the one permitted adapter path).
- **Client-side hardening** — CSP, Subresource Integrity, and other static-hosting
  headers appropriate to a GitHub Pages deployment.

## 4. Output

The Security Agent writes **only** under `/security/` (see §6, write boundary).

- One report per phase: `/security/FXSW-<lastTicket>-review.md`, where
  `<lastTicket>` is the highest ticket in the phase just completed (e.g.
  `/security/FXSW-077-review.md` for Phase 9).
- The report follows `/security/TEMPLATE.md`: review metadata (commit SHA, branch,
  phase), a findings table, then per-finding detail (track, severity,
  description, evidence with `file:line`, and a suggested resolution), and finally
  a **Proposed resolution work-item** — the backlog ticket(s) it recommends.
- Severity scale: `Critical · High · Medium · Low · Info`. Severity reflects the
  finding as written; it is independent of prototype scope (scope is decided at
  resolution).
- **Brand-neutrality applies to the report.** Refer to the external provider
  generically ("the external market-data provider"); do not introduce vendor
  names into `/security/`.

## 5. Cadence and handoff

The Security Agent runs **at the end of every phase**, from Phase 9 onward. The
end-of-phase order is:

1. **Build Agent** completes the phase and writes its phase summary.
2. **Security Agent** reviews the built artefact and writes
   `/security/FXSW-<lastTicket>-review.md`, including its proposed work-item.
3. The proposed work-item is filed as ordinary backlog ticket(s) in
   `docs/BACKLOG.md` (transcribed by the Build Agent, who owns `docs/`), triaged
   against the specs, and implemented in the **next** phase. Out-of-scope findings
   are recorded as accepted risk in the report with a one-line rationale.
4. **Wiki Agent** ingests the phase (the security report is part of its input).

Resolution must preserve the documented application flow: a fix that would change
canonical state names, break the seed-42 golden, or alter the GA baseline goes
through the normal backlog/spec process, not a silent patch.

## 6. Boundaries

- **Write boundary:** the Security Agent writes only under `/security/`. It never
  edits `/src`, `/tests`, `/docs`, `/wiki`, or `/raw`. It proposes; it does not
  patch.
- **No execution of attacks:** the review is static/analytical plus local,
  read-only tooling (`pnpm audit`, build inspection). It does not run live
  exploits, scans against third-party endpoints, or anything destructive.
- **Single repository:** review is limited to this repository's artefacts.

## 7. Relationship to the existing security-review skill

The repository's `/security-review` skill is a per-diff developer aid the Build
Agent may run while coding. The Security Agent is the broader, independent,
end-of-phase gate that reviews the whole built artefact and owns the `/security/`
findings record. The two are complementary: skill = inner loop, agent = phase
gate.
