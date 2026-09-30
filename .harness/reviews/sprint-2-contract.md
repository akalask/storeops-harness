# Sprint 2 Contract: Grace-Period Escalation to Store Manager

## Scope

Add escalation logic that checks breaches already detected by Sprint
1's `checkSlaBreaches`: if a breach has been unresolved (task still not
DONE) for longer than a configurable grace period, emit an
`SLA_ESCALATION` event to the Store Manager. Fires at most once per
breach, same as Sprint 1's notification.

## Touches

- Module(s): `activities` (owning), `staff` (read-only lookup for
  STORE_MANAGER)
- Layers: `activities/types.ts` (one new field), `activities/service.ts`
  (new method)
- New event(s) emitted: `SLA_ESCALATION` (declared in the baseline's
  `eventBus.ts`, not previously emitted by any code path until this
  sprint)

## Acceptance Criteria

1. GIVEN a task with `slaBreachDetectedAt` set more than
   `gracePeriodHours` ago, and status still not DONE, WHEN
   `checkSlaEscalations(now, gracePeriodHours)` runs THEN exactly one
   `SLA_ESCALATION` event is emitted with `payload.taskId` matching
   that task and `payload.storeManagerId` set to the store's Store
   Manager.
2. GIVEN the same task as (1), already escalated once, WHEN
   `checkSlaEscalations` runs again THEN no additional
   `SLA_ESCALATION` event fires for that task (no duplicate
   escalation).
3. GIVEN a breached task where `slaBreachDetectedAt` is LESS than
   `gracePeriodHours` ago, WHEN `checkSlaEscalations` runs THEN no
   `SLA_ESCALATION` event fires (still within grace period).
4. GIVEN a task that was breached but has since reached DONE, WHEN
   `checkSlaEscalations` runs THEN no `SLA_ESCALATION` event fires,
   even if the grace period has elapsed (resolved breaches don't
   escalate).
5. GIVEN a task with `slaBreachDetectedAt` still `null` (never
   breached — Sprint 1 never flagged it), WHEN `checkSlaEscalations`
   runs THEN it is not considered for escalation at all (escalation
   only applies to tasks that actually went through Sprint 1's breach
   detection).

## Out of Scope

- Making `gracePeriodHours` configurable via a REST endpoint or
  environment variable — it is a parameter to the method for this
  sprint; wiring it to configuration is a future concern.
- De-escalating or clearing `slaBreachDetectedAt` when a task is
  eventually marked DONE (the field stays as a historical record of
  when the breach was first detected; this sprint doesn't need to
  clear it since AC4 already excludes DONE tasks from escalation
  regardless of the timestamp's presence).
