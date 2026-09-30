# Reflection

## What The Harness Did Well

The retry loop is not theater — Sprint 1's iteration 1 contained a real
bug (a raw `Error` thrown for a missing-Department-Lead edge case), and
the Evaluator caught it because the hard gates are real commands with
real exit codes, not an LLM's opinion of whether the code "looks fine."
`lint` failed with exit code 1 and a specific file:line; `test` failed
with one specific assertion. The Generator's fix on iteration 2 was
verifiable the same way — 0 violations, 36/36 passing — not asserted,
demonstrated. That's the core value proposition of this harness design:
the 60%-weighted Architecture Compliance dimension never depends on an
LLM being in a good mood.

The contrast between Sprint 1 (2 iterations, 1 real failure) and Sprint
2 (1 iteration, clean pass, proactively reusing the `NoResponsiblePartyError`
pattern) is the small beginning of exactly the observability signal
`.harness/reviews/` is designed to produce: a second sprint's Generator
behaved differently because the first sprint's Evaluator feedback was
available context. One data point isn't a validated trend, but it's the
right kind of evidence, generated the right way.

## Where It Fell Short

**The demonstration endpoint is a real gap, not a rounding error.**
Both sprint contracts explicitly scoped out a REST trigger for the SLA
sweep as a "future concern" — a defensible per-sprint decision in
isolation. But Section 3.4 requires the feature be demonstrable through
the running application, and neither sprint's contract accounted for
that requirement. I added `POST /api/activities/run-sla-sweep` after
both sprints had already passed, outside the Planner/Generator/Evaluator
loop entirely. In a real engagement, that endpoint should have been its
own sprint contract, reviewed by the Evaluator like everything else —
not hand-added by the architect after the fact. This is exactly the
kind of gap the harness exists to prevent, and it happened anyway
because the Planner's sprint decomposition didn't account for an
end-to-end demonstrability requirement that lived outside the feature's
own acceptance criteria.

**The Evaluator's Acceptance Criteria Coverage dimension is still
partly self-reported.** The Evaluator trusts `generator-summary.md`'s
claimed test file:line mapping as its starting point for Step 2 of
`how-to-review/SKILL.md`, rather than independently re-deriving which
test covers which criterion from scratch. A Generator that mislabeled
its own summary table could, in principle, get a criterion marked
"Covered" that a fully independent audit would catch as mismatched.

## One Concrete Improvement

Add a third, fully automated check specifically for acceptance-criteria
traceability: a small script that parses each sprint contract's
numbered criteria and each test file's `test()` name strings, and flags
any criterion number that doesn't appear as a substring in at least one
test name in the corresponding test file. This wouldn't replace the
Evaluator's judgment about whether a test is *adequate* — that stays
LLM-assessed — but it would convert "does a test exist with this
criterion's number attached to it at all" from a self-reported claim
into a fourth hard gate, closing the self-reporting gap above with the
same kind of real, executable check the other three hard gates already
use.
