# CLAUDE.md — StoreOps Harness Orchestrator

This file is read automatically by Claude Code when launched in this
repository. It defines how a feature request becomes governed,
production-ready code.

## Entry Point

A developer starts a harness run with a single prompt addressed to the
Planner:

```
@planner <feature description>
```

Example (this repo's demonstration run — see PROMPT.md):

```
@planner Add SLA breach alerting: when a HIGH or CRITICAL task passes its
due date without reaching DONE, fire a SLA_BREACH notification to the
assigned Department Lead, and escalate to the Store Manager if unresolved
after a configurable grace period.
```

## Agents

Four agents, each defined in `.harness/agents/`:

| Agent | File | Reads before acting |
|---|---|---|
| Planner | `.harness/agents/planner.agent.md` | `app-context`, `architecture-principles`, `sprint-decomposition` |
| Generator | `.harness/agents/generator.agent.md` | `app-context`, `architecture-principles`, `coding-conventions`, `how-to-test` |
| Evaluator | `.harness/agents/evaluator.agent.md` | `architecture-principles`, `how-to-review`, `evaluation-criteria` |
| Monitor | `.harness/agents/monitor.agent.md` | `app-context` (+ the completed sprint's output files) |

## Orchestration Sequence

1. Developer invokes `@planner <feature prompt>`.
2. Planner reads its skill files, decomposes the feature into one or
   more sprint contracts, and writes:
   - `.harness/output/spec.md` — ends with `STATUS: AWAITING APPROVAL`
   - `.harness/output/sprint-1-contract.md` (and `sprint-2-contract.md`, etc. if multiple sprints)
3. **Orchestrator halts and waits.** It does not proceed until the
   developer reads `spec.md` and types `APPROVED` in the chat.
4. On `APPROVED`, the orchestrator starts the Generator/Evaluator loop
   for sprint 1:
   a. Generator reads the sprint contract + its skill files, writes code
      to `src/`, writes tests to `tests/`, and writes
      `.harness/output/generator-summary.md`.
   b. Evaluator reads the sprint contract, the generated code, and
      `generator-summary.md`. It runs the automated checks (see
      "Automated Checks" below), scores the two evaluation dimensions,
      and writes `.harness/output/evaluator-feedback.md` with a
      structured verdict: `PASS`, `CONDITIONAL_PASS`, or `FAIL`.
   c. Orchestrator reads the verdict line from `evaluator-feedback.md`
      and applies **Routing Logic** (below).
5. Once a sprint reaches `PASS`, Monitor reads that sprint's
   `evaluator-feedback.md` and `generator-summary.md`, and writes
   `run-log.md`, archived to `.harness/reviews/sprint-N-run-log.md`
   alongside the sprint's `evaluator-feedback.md` and
   `generator-summary.md` (also copied to `.harness/reviews/`).
6. If there is a next sprint contract, the orchestrator advances to it
   and repeats step 4 with a **reset context window** (see "Context
   Scoping" below). If not, the run ends.

## Routing Logic

The orchestrator reads only the first line of `evaluator-feedback.md`,
which the Evaluator is required to format as:

```
VERDICT: PASS | CONDITIONAL_PASS | FAIL
ITERATION: <n>
```

- **PASS** → Monitor runs, then advance to the next sprint (or end the run).
- **CONDITIONAL_PASS** → treated as PASS for advancement, but Monitor
  flags it in `run-log.md` as a quality-trend note (soft checks failed,
  hard gates passed). Advancement is not blocked, but this is exactly
  the signal the sprint-decomposition and coding-conventions skill files
  should be refined against if it recurs.
- **FAIL** → orchestrator sends `evaluator-feedback.md` back to the
  Generator as input for a retry. `ITERATION` increments.
- **ITERATION reaches 3 without a PASS** → orchestrator does not retry
  again. It writes `.harness/output/escalation.md` containing:
  - the sprint ID
  - the iteration count (3)
  - the specific blocking issue(s), copied verbatim from the last
    `evaluator-feedback.md`
  - a suggestion of which skill file likely needs revision
  and halts, returning control to the developer.

This 3-iteration cap is a hard limit, not a target — most sprints in
this codebase should PASS on iteration 1 given the skill files below.

## Context Scoping Strategy

Each agent invocation is a **fresh context window**, not a continuation
of the previous agent's conversation. Context is passed only through the
handoff files in `.harness/output/` — never through shared conversation
history. Concretely:

- The Generator does NOT see the Planner's reasoning about *why* the
  sprint was decomposed a certain way — only the sprint contract's
  GIVEN/WHEN/THEN acceptance criteria and the skill files it reads.
- The Evaluator does NOT see the Generator's chain-of-thought — only the
  sprint contract, the resulting diff, and `generator-summary.md`.
- On a FAIL retry, the Generator's *next* invocation is also a fresh
  context window, seeded with `evaluator-feedback.md` as the only
  additional input beyond its normal skill reads. It does not carry
  forward memory of its previous (failed) attempt beyond what
  `evaluator-feedback.md` states.

This is a deliberate token-cost and quality decision: unbounded context
growth across a multi-sprint run degrades both attention (skill-file
instructions get diluted by accumulated chat history) and cost
(each turn re-sends the whole transcript). Bounding context to
file-based handoffs keeps every agent's input size roughly constant
regardless of how many sprints have run before it.

## Automated Checks / CI Relationship

The Evaluator's hard gates call three real, executable commands against
this repository:

```
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint + dependency-cruiser StoreOps architecture rules
npm run test        # node --test (build + run)
```

**Relationship to CI/CD:** the harness's checks are designed to run
*before* a pull request is opened — they are a pre-CI gate. A developer
using this harness should never open a PR that would fail these three
commands, because they're the same three commands CI would also run
(see `package.json`'s `verify` script, which chains all three). The
harness does not replace CI — it front-loads CI's feedback into the
AI-assisted authoring loop itself, so failures are caught and fixed by
the Generator/Evaluator loop, not by a human reviewer downstream.

## Repository Layout Note

`.harness/` is used instead of `.github/` specifically to keep harness
configuration separate from CI/CD pipeline configuration — this is a
structural choice for this repo, not a deviation from any reference
implementation.
