# Skill: App Context

## Purpose

Orient any agent to what StoreOps is before it reads or writes a single
line, without re-deriving this from the codebase every time.

## What StoreOps Is

A REST API for retail store operations management, serving an 8-developer
squad at a retail client. Store teams use it to create operational
programmes, assign and track activities across departments, coordinate
staff, and view performance reports by store and region.

## The 5 Modules

| Module | Owns | Key entities |
|---|---|---|
| `activities` | Operational tasks — restocking, planogram resets, compliance checks | `Task` (status: TODO/IN_PROGRESS/DONE/BLOCKED; priority: LOW/MEDIUM/HIGH/CRITICAL; category: RESTOCKING/PLANOGRAM/AUDIT/COMPLIANCE/GENERAL) |
| `programmes` | Store programmes and their staff membership | `Project`, `ProjectMember` (role: STORE_MANAGER/DEPARTMENT_LEAD/ASSOCIATE) |
| `staff` | Staff registration, auth, profiles — **read-only for every other module** | `User` (role: REGIONAL_MANAGER/STORE_MANAGER/DEPARTMENT_LEAD/ASSOCIATE) |
| `alerts` | In-app notifications triggered by operational events | `Notification` (alertType: INVENTORY/SLA_BREACH/SHIFT_HANDOVER/ESCALATION) |
| `reports` | Store/regional performance aggregation — **read-only, writes nothing to other modules** | `Report` (type: STORE_SUMMARY/REGIONAL_ROLLUP/DEPARTMENT_PERFORMANCE) |

## Stack (as actually deployed in this repository)

TypeScript (strict mode), a native `http`-based router (not Express —
see DESIGN_BRIEF.md Section D for why), `node:test` for tests (not
Jest/supertest), and a custom lint script at `scripts/lint.js` (not
ESLint/dependency-cruiser) enforcing the StoreOps-specific rules in
`architecture-principles/SKILL.md`. In-memory storage, no database.

## Where Things Live

```
src/
  shared/errors.ts      <- AppError hierarchy, every module's errors extend this
  shared/eventBus.ts    <- the only permitted channel for cross-module side effects
  shared/router.ts       <- the HTTP layer every module's routes.ts plugs into
  <module>/types.ts      <- entity + input/output types
  <module>/repository.ts <- data access only
  <module>/service.ts    <- business logic, validation, error throwing, event emission
  <module>/routes.ts      <- HTTP parsing/validation only, calls service
  server.ts               <- wires all 5 modules' routers together
tests/<module>/...        <- mirrors src/<module>/ structure
.harness/
  agents/    <- Planner, Generator, Evaluator, Monitor definitions
  skills/    <- this directory
  output/    <- gitignored working files for the current run
  reviews/   <- committed audit trail, one set of files per sprint
```

## The Four Failure Modes This Harness Exists to Prevent

(From the client engagement that made this harness necessary — see
DESIGN_BRIEF.md Section B for the full traceability.)

1. Direct imports from another module's repository, bypassing the
   service boundary and event bus.
2. Raw `Error` throws in service methods, bypassing the typed
   `AppError` hierarchy.
3. Tests that assert HTTP status codes but don't verify the actual
   business rule.
4. Missing event bus integration — state changes written directly to
   sibling modules' repositories.

Every rule in `architecture-principles/SKILL.md` and every hard gate in
`evaluation-criteria/SKILL.md` traces back to one of these four.
