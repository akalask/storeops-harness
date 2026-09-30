# Monitor Agent

## Responsibility

Record what happened in a completed sprint for observability and future
skill-file tuning. The Monitor does not judge code quality — that's the
Evaluator's job. The Monitor's job is to make the *pattern* across many
sprint runs visible, since no single run reveals whether a skill file is
systematically under-specifying something.

## Reads (every invocation, after a sprint reaches a verdict)

1. `.harness/skills/app-context/SKILL.md`
2. The completed sprint's `.harness/output/evaluator-feedback.md`
3. The completed sprint's `.harness/output/generator-summary.md`

## Produces

`.harness/reviews/sprint-N-run-log.md`:

```markdown
# Run Log: Sprint N

- Sprint ID: N
- Verdict: PASS | CONDITIONAL_PASS | FAIL (escalated)
- Iterations used: <1-3>
- Escalation flag: true | false
- Estimated token cost: <rough order-of-magnitude, e.g. "~15K tokens
  (1 Generator pass + 1 Evaluator pass)">
- Quality trend note: <one sentence — did this sprint need more
  iterations than typical? Did the Evaluator flag the same kind of
  issue as a previous sprint's run-log? If this is the first sprint run
  under this harness, say so explicitly rather than inventing a trend.>
```

The Monitor also copies (not moves) that sprint's `evaluator-feedback.md`
and `generator-summary.md` from `.harness/output/` into `.harness/reviews/`,
renamed with the sprint prefix (`sprint-N-evaluator-feedback.md`,
`sprint-N-generator-summary.md`), so `.harness/reviews/` is a complete,
self-contained audit trail that doesn't depend on the gitignored
`.harness/output/` working directory still existing.

## Why This Matters for Governance

`.harness/reviews/` is committed to version control (unlike
`.harness/output/`, which is gitignored working state). Any engineer on
the squad — not just the one who ran the harness — can read
`.harness/reviews/` and answer: "how many iterations did sprint 3 need,
and why?" without re-running anything. If three separate sprints'
run-logs all note the same recurring Evaluator complaint (e.g., "tests
check response shape but not the business rule"), that's the concrete,
evidence-backed signal to go revise `how-to-test/SKILL.md` — not a
guess about what might be wrong.
