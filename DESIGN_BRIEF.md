# Harness Design Brief

## Section A — Intent Decomposition

### How the feature was broken into sprint contracts, and why

The SLA breach alerting feature was split into two sprints because
there is a genuine ordering dependency between them, not because
either half was too large on its own. Sprint 2's escalation logic
needs to know *when* a breach was first detected in order to compute
whether a configurable grace period has elapsed — and that timestamp
doesn't exist until Sprint 1's detection logic creates it. Testing
Sprint 2 in isolation, before Sprint 1's `slaBreachDetectedAt` field
exists, would be meaningless; there would be nothing for the grace-
period comparison to compare against. This is the specific test from
`sprint-decomposition/SKILL.md` for when splitting is warranted: "split
when a feature has a natural before/after dependency," not "split
because a single sprint felt big." A feature with no such dependency —
say, adding a single new read-only endpoint — should stay one sprint,
because splitting it would only create integration risk between two
halves that don't actually depend on each other.

- **Sprint 1** — detect the breach, notify the Department Lead once.
- **Sprint 2** — given an already-detected, still-unresolved breach,
  escalate to the Store Manager after a grace period, once.

### GIVEN/WHEN/THEN structure and what makes a criterion testable

A criterion counts as testable, in this harness's terms, if a test
could assert its THEN clause with one specific check that would fail
if the business rule were subtly wrong — not merely if the feature
were entirely absent. `sprint-decomposition/SKILL.md` gives the
contrast directly: "appropriate action is taken" is not testable
because no single assertion pins it down; "eventBus emits exactly one
SLA_BREACH event with payload.taskId matching the task's id" is,
because a test can check exactly that and nothing more.

### One example sprint contract entry, in full

From `sprint-1-contract.md`, Acceptance Criterion 2:

> GIVEN the same task as (1), already breached and notified once WHEN
> `checkSlaBreaches(now)` runs again THEN no additional `SLA_BREACH`
> event is emitted for that task (no duplicate notification for the
> same unresolved breach).

This is testable in the strict sense: the corresponding test
(`tests/activities/slaBreach.test.ts`, "AC2") calls
`checkSlaBreaches(new Date())` twice against the same task and asserts
the captured event count is exactly 1, not 2. A Generator that
accidentally re-notified on every sweep — a realistic mistake for an
AI coding tool to make, since "check for overdue tasks" naturally reads
as "re-check every time" unless the "once per breach" constraint is
stated explicitly — would fail this specific assertion, not some vague
downstream symptom.

## Section B — Governance Framework

### Skill file strategy

Seven skill files split across three groups, matching the reads each
agent actually needs rather than one large shared document every agent
partially ignores:

- **Shared (`app-context`, `architecture-principles`)** — read by every
  agent. `app-context` is the "orient yourself" document: what StoreOps
  is, where files live, and — critically — the four client failure
  modes this entire harness exists to prevent, stated explicitly so
  every agent's actions can be traced back to a real, motivating
  problem rather than an abstract style preference. `architecture-
  principles` states the 5 non-negotiable rules with a bad/good code
  example for each, plus which `scripts/lint.js` rule checks it
  automatically.
- **Generator-specific (`coding-conventions`, `how-to-test`,
  `sprint-decomposition`)** — `coding-conventions` is deliberately
  StoreOps-specific, not generic TypeScript style: it documents this
  project's actual `AppError` subclass list, the exact `EventBus`
  payload shape convention observed in the baseline (small ID-bearing
  objects, not full entities), and the router's request/response
  method signatures. `how-to-test` exists specifically to prevent
  client failure mode #3 (tests that check shape, not substance) — it
  includes a worked weak-vs-correct test example lifted directly from
  this repository's own SLA feature, so the contrast is concrete, not
  hypothetical. (`sprint-decomposition` is Planner-specific, not
  Generator-specific, but is grouped here for skill-file numbering —
  see the agent table in `CLAUDE.md`.)
- **Evaluator-specific (`how-to-review`, `evaluation-criteria`)** —
  `how-to-review` is a fixed, ordered procedure (run the three real
  checks -> re-check each acceptance criterion's test -> skim for
  business logic hiding in route handlers -> assign the verdict ->
  write actionable feedback), specifically so two independent Evaluator
  runs against the same Generator output converge on the same verdict.
  `evaluation-criteria` is the weights, the hard gates, and — this is
  the part that matters most — an explicit accounting of *why* each
  hard gate is hard rather than soft, mapped back to the specific
  client failure mode it closes.

### How `.harness/reviews/` functions as a governance audit trail

Every sprint's `evaluator-feedback.md`, `generator-summary.md`, and
`run-log.md` are committed (not gitignored, unlike the working
`.harness/output/` directory) under a `sprint-N-` prefix. Any engineer
on the squad — not just whoever ran the harness — can open
`.harness/reviews/sprint-1-run-log.md` and answer "how many iterations
did this take, and why" without re-running anything: the actual `lint`
and `test` output that caused iteration 1's FAIL is quoted verbatim in
`sprint-1-evaluator-feedback.md`, not paraphrased. A recurring quality
issue would surface exactly the way Sprint 2's run-log flags it in this
demonstration: by comparing consecutive sprints' iteration counts and
the *stated reason* for the difference (Sprint 2's Generator explicitly
credited Sprint 1's feedback for avoiding the same mistake). If a third
sprint reintroduced a raw `Error`, that specific, recorded pattern
across three run-logs — not a hunch — would be the evidence to revise
`coding-conventions/SKILL.md`'s placement of the error-contract rule.

### One skill file rule traceable to a specific StoreOps decision

`architecture-principles/SKILL.md` Rule 2 (Event Bus Only) states that
**`staff`'s service is the one module service any other module may
import directly** — every other cross-module service import is
forbidden; side effects must go through `eventBus.emit()` instead. This
single carve-out exists because `staff` is explicitly read-only
(Section 3.4 of the capstone spec: "modules may call another module's
service layer for read-only lookups"), and StoreOps' SLA feature
genuinely needs a synchronous answer to "who is the Department Lead for
this store" at the moment a breach is detected — an event-based lookup
would require round-tripping a request/response pair through the bus
for what is fundamentally a read, adding complexity with no
corresponding benefit. Without this rule stated explicitly as an
exception (rather than left for each agent to improvise), the Generator
would face a genuine ambiguity on every sprint that needs staff data:
import directly (fast, simple, but is it "allowed"?) or emit-and-wait
(technically consistent with Rule 2's letter, but there's no real
mechanism in this codebase for a synchronous event-based query-response,
so this would require inventing one). Sprint 1 and Sprint 2 both
imported `StaffService` directly with zero lint violations and zero
Evaluator confusion, precisely because the rule already answered the
question before the Generator had to guess.

## Section C — Non-Determinism Strategy

### Evaluation dimensions, weights, and why

**Architecture Compliance (60%), fully hard-gated; Acceptance Criteria
Coverage (40%), LLM-assessed but converted to N independent binary
checks.** The 60/40 split (not 50/50) reflects that architecture
violations are categorically worse for this client — they are exactly
the four failure modes the standards team already flagged as blocking
the Claude Code rollout — while acceptance criteria coverage, though
important, is closer to ordinary code-review rigor that any competent
review process (human or AI) would also catch eventually. Weighting the
gate the client explicitly named as a rollout blocker more heavily than
general code quality is a deliberate reflection of engagement context,
not an arbitrary split.

### Hard gate rationale — why each one cannot be a soft check

`typecheck`, `lint`, and `test` are hard gates, meaning a single
non-zero exit code fails the whole sprint regardless of any other
score. The reason none of these can be softened into "mostly passing is
fine": a module-boundary violation, a raw `Error` throw, or a broken
test either exists in the diff or it doesn't — there is no meaningful
partial-credit version of "half-respects the event bus." Softening any
of the three into an LLM-scored dimension would reintroduce exactly the
variability problem this harness exists to eliminate: the same
violation might get flagged at 60% confidence on one run and 90% on
another, for no reason connected to the code itself.

### Walkthrough: variable Generator output -> deterministic verdict

Sprint 1, iteration 1 is this walkthrough, not a hypothetical. The
Generator produced code with a real, specific flaw (a raw `throw new
Error(...)` for a genuinely edge-case scenario — a store with no seeded
Department Lead — that a reasonable first-pass implementation could
plausibly produce, since the sprint contract deliberately left the
exact handling choice open). Running the actual `npm run lint` command
against that code deterministically returns exit code 1 with the
specific violation `[error-contract] src/activities/service.ts:79`;
running `npm run test` deterministically returns exit code 1 with the
specific failing assertion named. Neither of those facts depends on an
LLM's mood — they are the literal output of deterministic tools. The
Evaluator's only actual judgment call in this walkthrough was Step 2 of
`how-to-review/SKILL.md` (checking whether the other 5 criteria's tests
were substantive, not shape-only) — a narrow, binary question asked 5
times, not one holistic "is this sprint good" impression.

### Escalation path

After 3 failed iterations on a single sprint (not encountered in this
demonstration — both sprints resolved within the cap), `CLAUDE.md`'s
orchestrator writes `.harness/output/escalation.md` naming the sprint
ID, the iteration count, and the specific blocking issue copied
verbatim from the last `evaluator-feedback.md` — then halts and returns
control to the developer. The developer is the recipient; the expected
response is either a manual fix, a revision to the sprint contract if
the contract itself was under-specified, or a revision to the relevant
skill file if the same category of mistake has now shown up in
`.harness/reviews/` across multiple sprints.

## Section D — Architectural Decisions

### Decision 1: Zero-dependency stack (native `http` + `node:test` + custom lint) instead of Express + Jest + supertest + ESLint

- **Alternatives considered:** (a) write the code assuming the
  document-specified stack and leave it unverified in this sandbox; (b)
  find another way to get packages into the sandbox (no viable path
  existed); (c) the zero-dependency approach actually taken.
- **Rationale:** this sandbox has no npm registry access, so (a) would
  mean shipping a harness that has never actually executed its own
  Evaluator hard gates — directly undermining the capstone's Section
  5.5 requirement that the harness run "without manual intervention"
  and produce real evaluator-feedback.md verdicts. The zero-dependency
  path makes every claim in this repository's `.harness/reviews/`
  verifiable by re-running the same three commands, right now, by
  anyone.
- **Assumption this decision depends on:** that a reviewer values a
  harness whose every claimed PASS/FAIL is independently re-runnable
  over one that more closely matches the letter of the document's
  stack table. If a reviewer instead strictly requires Express/Jest by
  name regardless of verifiability, this decision should be revisited
  on a machine with registry access — the architecture (Router
  interface, AppError hierarchy, EventBus) was written to make that
  swap mechanical, not a rewrite.

### Decision 2: `eventBus` as a process-wide singleton rather than a per-`createApp()` instance

- **Alternatives considered:** (a) singleton (what's implemented); (b)
  inject a fresh `EventBus` instance into `createApp()` and thread it
  through every module's constructor.
- **Rationale:** (a) matches how the application actually runs in
  production — one process, one event bus, genuinely global. (b) is
  more testable in isolation (no cross-test-file listener
  accumulation, a real issue noted in `how-to-test/SKILL.md`'s Test
  Isolation Note) but adds a constructor parameter to every module's
  service that exists purely for testability, not for any production
  need.
- **Assumption this decision depends on:** that this reference codebase
  will only ever run as a single process. If StoreOps ever needed
  multiple worker processes sharing event state, the singleton would
  need to become a real message broker (Redis pub/sub, etc.) regardless
  of which of the two alternatives above was chosen today — so this
  decision is "good enough for a single-process reference app," not a
  claim that it would scale as-is.

### Decision 3: adding `POST /api/activities/run-sla-sweep` outside the Planner/Generator/Evaluator loop, after both sprints already passed

- **Alternatives considered:** (a) leave the feature with no REST
  trigger, as both sprint contracts explicitly scoped; (b) add the
  endpoint as its own third sprint contract, reviewed by the Evaluator
  like everything else; (c) add it directly, as the architect, outside
  the harness.
- **Rationale:** (a) would fail Section 3.4's explicit requirement that
  the feature be demonstrable via a live endpoint. (b) is the correct
  answer and is named as such in `REFLECTION.md` — but discovering the
  gap only after both sprints had already passed meant the honest
  choice was to document the process failure rather than retroactively
  pretend a third sprint contract had existed from the start.
- **Assumption this decision depends on:** that transparently
  documenting a process gap is more valuable to a reviewer than a
  clean-looking three-sprint narrative that didn't actually happen in
  that order. See `REFLECTION.md` for the full accounting of why this
  gap occurred and what would prevent it next time.
