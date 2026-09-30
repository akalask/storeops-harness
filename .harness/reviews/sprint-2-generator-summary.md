# Generator Summary: Sprint 2

## Acceptance Criteria Self-Check

| # | Criterion (short) | Implemented? | Test file:line |
|---|---|---|---|
| 1 | Unresolved breach past grace period escalates exactly once | Yes | tests/activities/slaEscalation.test.ts:36 |
| 2 | Already-escalated breach doesn't escalate again | Yes | tests/activities/slaEscalation.test.ts:45 |
| 3 | Breach within grace period doesn't escalate | Yes | tests/activities/slaEscalation.test.ts:54 |
| 4 | DONE task doesn't escalate even past grace period | Yes | tests/activities/slaEscalation.test.ts:63 |
| 5 | Never-breached task isn't considered for escalation | Yes | tests/activities/slaEscalation.test.ts:73 |

## Files Changed

- `src/activities/types.ts` — added `slaEscalatedAt: string | null` to `Task`
- `src/activities/repository.ts` — added `findUnescalatedBreaches()` (read-only scan) and
  `markSlaEscalated(id, escalatedAt)`
- `src/activities/service.ts` — added `checkSlaEscalations(now, gracePeriodHours)`, reusing the
  same `NoResponsiblePartyError` pattern from Sprint 1 for the missing-Store-Manager edge case
  (learned from Sprint 1's iteration-1 FAIL — applied proactively here rather than repeating the
  raw-Error mistake)
- `tests/activities/slaEscalation.test.ts` — new file, 5 tests, one per acceptance criterion

## Known Gaps

- `gracePeriodHours` is a method parameter, not yet wired to configuration — explicitly out of
  scope per the sprint contract.
- The missing-Store-Manager case (`NoResponsiblePartyError`) has no dedicated test in this sprint
  the way Sprint 1's AC6 did — the contract didn't ask for one explicitly, but this is worth
  flagging: the same code path exists and is currently unverified by a test. Noting this
  proactively for the Evaluator rather than waiting to be asked.
