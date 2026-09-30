# Skill: Sprint Decomposition

## Purpose

Tell the Planner how to size a sprint and how to write an acceptance
criterion that the Evaluator can actually grade objectively, rather
than leaving both judgment calls to the Planner's unstructured
discretion each time.

## How To Size a Sprint

A sprint should be small enough that:
- It touches at most 2 modules (one "owning" module doing the new work,
  optionally one other module it emits an event to).
- A single Generator invocation can plausibly implement it correctly
  on the first attempt, if the contract is well-specified.
- The Evaluator can review it without needing to hold more than
  ~5 acceptance criteria in mind at once.

**Split into multiple sprints when:** a feature has a natural
before/after dependency (e.g., "add the sweep logic" must exist before
"add the escalation logic that runs after the sweep finds something").
**Do not split** a feature into sprints just to make each one smaller
if the pieces have no real ordering dependency — that creates
integration risk between sprints for no benefit.

## Why Sprint Boundaries Matter to the Evaluator

Each sprint gets independently hard-gated (typecheck/lint/test must all
pass before that sprint can advance). A sprint boundary drawn in the
middle of a single coherent business rule (e.g., splitting "detect
breach" and "notify department lead" into two sprints when they're
really one atomic rule) forces the first sprint's tests to either test
an incomplete rule or not exist yet — both bad. Draw the boundary at a
point where the sprint's own acceptance criteria are independently,
completely testable without the next sprint existing yet.

## Writing a Testable GIVEN/WHEN/THEN

**Testable** means: a specific precondition, a specific action, and an
observable outcome that a test can assert with one specific check — not
a vague quality goal.

```
BAD (subjective, not testable as written):
GIVEN a task is overdue
WHEN the system checks it
THEN appropriate action is taken

GOOD (testable — a test can assert this exactly):
GIVEN a task with priority CRITICAL and dueDate in the past, status != DONE
WHEN checkSlaBreaches() runs
THEN eventBus emits exactly one SLA_BREACH event with payload.taskId
     matching the task's id, and the task's slaBreachNotified flag
     (if the Generator adds one) is not re-triggered on a second run
     with the same task
```

The difference: the BAD version can't fail a test except by the test
author's own arbitrary interpretation. The GOOD version has one
specific, checkable fact (an event was emitted, with a specific payload
field, exactly once) that either did or didn't happen.

## Required Sections Recap

See `planner.agent.md` for the exact required format
(Scope / Touches / Acceptance Criteria / Out of Scope). "Out of Scope"
is not optional filler — it's where the Planner heads off the most
common source of Generator/Evaluator disagreement: the Generator
assuming a nearby concern is in scope, building it, and the Evaluator
either penalizing scope creep or (worse) treating unrequested code as
satisfying a criterion it doesn't actually satisfy.
