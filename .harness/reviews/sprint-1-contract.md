# Sprint 1 Contract: SLA Breach Detection and Department Lead Notification

## Scope

Add a sweep method to the `activities` module that finds HIGH/CRITICAL
tasks past their due date and not yet DONE, and — for each one not
already notified — emits an `SLA_BREACH` event carrying the Department
Lead's user id, then marks the task so it is not re-notified on a
subsequent sweep. Does NOT add the grace-period escalation (Sprint 2).

## Touches

- Module(s): `activities` (owning), `staff` (read-only lookup via
  `StaffService.findUsersByRole`)
- Layers: `activities/types.ts` (new fields), `activities/repository.ts`
  (new query + mutation methods), `activities/service.ts` (new sweep
  method), `activities/routes.ts` (no new route required — the sweep is
  invoked by the service layer; a manual-trigger endpoint is optional
  and out of scope per "Out of Scope" below)
- New event(s) emitted: `SLA_BREACH` (already declared in
  `eventBus.ts`'s `StoreOpsEventName` union; this sprint is the first
  real emitter)

## Acceptance Criteria

1. GIVEN a task with priority CRITICAL, status TODO, and dueDate in the
   past WHEN `checkSlaBreaches(now)` runs THEN exactly one `SLA_BREACH`
   event is emitted with `payload.taskId` equal to that task's id.
2. GIVEN the same task as (1), already breached and notified once
   WHEN `checkSlaBreaches(now)` runs again THEN no additional
   `SLA_BREACH` event is emitted for that task (no duplicate
   notification for the same unresolved breach).
3. GIVEN a task with priority LOW or MEDIUM, past due, not DONE
   WHEN `checkSlaBreaches(now)` runs THEN no `SLA_BREACH` event is
   emitted for that task (priority filter is enforced).
4. GIVEN a task with priority HIGH, due date in the future
   WHEN `checkSlaBreaches(now)` runs THEN no `SLA_BREACH` event is
   emitted for that task (not yet overdue).
5. GIVEN a task with priority CRITICAL, past due, status DONE
   WHEN `checkSlaBreaches(now)` runs THEN no `SLA_BREACH` event is
   emitted for that task (resolved tasks are not breaches).
6. GIVEN a CRITICAL task past due with no Department Lead found for its
   store WHEN `checkSlaBreaches(now)` runs THEN the sweep does not
   throw a raw error — it throws a typed `AppError` subclass, or skips
   that task and continues processing the rest of the batch (Planner
   leaves this choice to the Generator; `generator-summary.md` must
   state which was chosen, since the contract doesn't fully specify it
   — see Evaluator's Fallback Note handling for this exact case).

## Out of Scope

- The grace-period escalation to Store Manager (Sprint 2).
- A REST endpoint to manually trigger the sweep (this sprint only adds
  the service-layer method; wiring a scheduled job or an admin endpoint
  to call it is a future concern, not part of this sprint).
- Persisting *when* the sweep last ran (no new "last swept at" global
  state — each call just re-evaluates current task states as of `now`).
