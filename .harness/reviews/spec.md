# Spec: SLA Breach Alerting

## Feature Summary

When a HIGH or CRITICAL priority task passes its due date without
reaching DONE, the system notifies the assigned Department Lead. If the
breach remains unresolved after a configurable grace period, it
escalates to the Store Manager. Both notifications fire via the event
bus (Rule 2 — Event Bus Only) and fire at most once per breach (not
once per check).

## Decomposition Rationale

Split into 2 sprints because there's a real ordering dependency:
escalation logic needs breach-detection state (specifically, *when* a
breach was first detected) to compute whether the grace period has
elapsed. Sprint 2 cannot be meaningfully tested without Sprint 1's
`slaBreachDetectedAt` field existing on the Task record. This is not an
arbitrary split for sprint-sizing reasons — see
`sprint-decomposition/SKILL.md`'s guidance on when splitting is and
isn't warranted.

- **Sprint 1** — breach detection + first notification to Department Lead.
- **Sprint 2** — grace-period escalation to Store Manager, building on
  Sprint 1's breach-timestamp state.

## Modules Touched

- `activities` (owning module — new sweep method, new Task fields)
- `staff` (read-only lookup — find the Department Lead / Store Manager
  for a store, via `StaffService`, the one permitted direct
  cross-module service call)
- `alerts` (event bus subscriber — already wired for `SLA_BREACH` and
  `SLA_ESCALATION` in the baseline; sprint 2 confirms the escalation
  path is exercised)

## New Events

- `SLA_BREACH` (already declared in `src/shared/eventBus.ts`'s
  `StoreOpsEventName` union in the baseline — not new, but not
  previously emitted by any real code path until Sprint 1)
- `SLA_ESCALATION` (same — declared, not previously emitted until Sprint 2)

STATUS: AWAITING APPROVAL
