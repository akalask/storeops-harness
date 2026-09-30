# Generator Summary: Sprint 1

(Iteration 2 — final. Iteration 1 is preserved in `.harness/reviews/sprint-1-evaluator-feedback.md`'s
history via git; see commit history for the iteration-1 diff that introduced the raw `Error` this
summary's fix corrects.)

## Acceptance Criteria Self-Check

| # | Criterion (short) | Implemented? | Test file:line |
|---|---|---|---|
| 1 | Exactly one SLA_BREACH on first sweep | Yes | tests/activities/slaBreach.test.ts:37 |
| 2 | No duplicate notification on second sweep | Yes | tests/activities/slaBreach.test.ts:53 |
| 3 | LOW/MEDIUM priority excluded | Yes | tests/activities/slaBreach.test.ts:70 |
| 4 | Future due date excluded | Yes | tests/activities/slaBreach.test.ts:91 |
| 5 | DONE status excluded | Yes | tests/activities/slaBreach.test.ts:105 |
| 6 | No-Department-Lead case throws typed AppError, not raw Error | Yes (fixed in iteration 2) | tests/activities/slaBreach.test.ts:121 |

## Files Changed

- `src/activities/types.ts` — added `slaBreachDetectedAt: string \| null` to `Task`
- `src/activities/repository.ts` — added `findOverdueHighPriority(now)` (read-only scan) and
  `markSlaBreachDetected(id, detectedAt)`
- `src/activities/service.ts` — added `checkSlaBreaches(now)`; constructor now takes a
  `StaffService` dependency (read-only cross-module lookup, the one permitted direct-service-import
  pattern per Rule 2)
- `src/shared/errors.ts` — added `NoResponsiblePartyError` subclass (iteration 2 fix)
- `src/server.ts` — wired `StaffService` into `ActivitiesService`'s constructor
- `tests/activities/slaBreach.test.ts` — new file, 6 tests, one per acceptance criterion
- `tests/activities/service.test.ts` — updated existing `makeService()` helper to pass the new
  required `StaffService` argument (no behavior change, just the updated constructor signature)

## Known Gaps

- AC6 left the choice between "throw a typed error" and "skip and continue processing the batch"
  to the Generator. This implementation throws `NoResponsiblePartyError` and does NOT continue
  processing the rest of the batch after the first missing-Lead task is hit — a genuinely thorough
  implementation might instead collect all such failures and continue the sweep, throwing (or
  returning) an aggregate at the end. That refinement is out of scope for this sprint's contract as
  written; flagging it here as a candidate follow-up rather than silently deciding it was included.
- No REST endpoint triggers `checkSlaBreaches` yet (explicitly out of scope per the sprint
  contract) — it can only be called from a test or from a future scheduled job / admin endpoint.
