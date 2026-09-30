# Skill: Architecture Principles

## Purpose

State the 5 non-negotiable StoreOps rules precisely enough that the
Generator can follow them without guessing, and the Evaluator can check
them without guessing. Every rule below maps to a specific automated or
LLM-assessed check in `evaluation-criteria/SKILL.md`.

## Rule 1 — Module Boundary

**No module may import directly from another module's `repository.ts`.**
Cross-module reads go through the target module's `service.ts` only.

```ts
// BAD — activities/service.ts importing programmes' repository directly
import { ProgrammesRepository } from "../programmes/repository";

// GOOD — activities/service.ts reading via programmes' service
import { ProgrammesService } from "../programmes/service";
```

Checked automatically by `scripts/lint.js` rule `module-boundary`
(scans every import statement in `src/` for `from ".../repository"`
crossing a module folder boundary).

## Rule 2 — Event Bus Only

**Side effects that cross module boundaries must be raised via
`eventBus.emit()` — never by importing another module's `service.ts`
directly**, with exactly one exception: **`staff`'s service may be
imported directly by any module**, because `staff` is explicitly
read-only and that's the one permitted read-only lookup pattern
(Section 3.4 of the capstone spec).

```ts
// BAD — activities/service.ts importing alerts' service directly to
// create a notification as a side effect of a task going overdue
import { AlertsService } from "../alerts/service";

// GOOD — activities/service.ts emits an event; alerts subscribes to it
import { eventBus } from "../shared/eventBus";
eventBus.emit("SLA_BREACH", { taskId, departmentLeadId, storeId });

// ALSO FINE — staff is the read-only exception
import { StaffService } from "../staff/service";
```

Checked automatically by `scripts/lint.js` rule `event-bus-only`.

## Rule 3 — Error Contract

**No raw `throw new Error(...)` in services or routes.** Every thrown
error extends `AppError` (`src/shared/errors.ts`) and carries a `code`,
`message`, and `statusCode`. If no existing subclass fits, add one to
`errors.ts` rather than throwing a raw `Error`.

```ts
// BAD
throw new Error("task not found");

// GOOD
throw new NotFoundError(`Task ${id} not found`);
```

Checked automatically by `scripts/lint.js` rule `error-contract`
(regex scan for `throw new Error(` in `service.ts`/`routes.ts` files).

## Rule 4 — Layer Separation

**Routes → Service → Repository, no skipping.** Routes parse/validate
HTTP input and call a service method — they contain no business logic.
Repositories are data access only — no HTTP imports, no business rules,
no calls to other modules' anything.

```ts
// BAD — routes.ts importing repository.ts directly
import { ActivitiesRepository } from "./repository";

// GOOD — routes.ts only talks to its own service.ts
import { ActivitiesService } from "./service";
```

Checked automatically by `scripts/lint.js` rule `layer-separation`
(routes must not import any `repository.ts`; repositories must not
import `shared/router` or `node:http`).

## Rule 5 — Read-Only Reports

**The `reports` module aggregates data from `activities`, `programmes`,
and `staff` — it never writes to those modules.** It may call their
service layers for reads, exactly like any other module's read-only
access, but no other module's create/update/delete operation may
originate from `reports`.

Checked automatically by `scripts/lint.js` rule `read-only-reports`
(scans `src/reports/` for any repository import outside its own
module).

## What the Evaluator Cannot Automate (and Checks by Reading Code)

Rules 2 and 4 have an automatable half (import-statement scanning) and
an LLM-assessed half: the Evaluator must also *read* the diff to confirm
a Generator didn't satisfy the linter by, say, moving business logic
into a route handler's closure instead of calling the service (which
would pass the `layer-separation` lint check's import-scan but still
violate the rule's intent). See `how-to-review/SKILL.md`.
