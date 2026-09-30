# Skill: Coding Conventions

## Purpose

Give the Generator the specific, stack-level decisions it needs to
produce code that looks like it was written by the same team that wrote
the baseline — not generic TypeScript, StoreOps TypeScript.

## Stack Reminder

No Express, no Jest, no ESLint — see `app-context/SKILL.md`. Use the
existing `Router` class (`src/shared/router.ts`), the existing
`AppError` hierarchy, and the existing `eventBus` singleton. Do not
introduce a new HTTP framework, test framework, or error base class.

## File Naming and Layout

- One module = one folder under `src/`: `types.ts`, `repository.ts`,
  `service.ts`, `routes.ts`. Do not split a layer across multiple files
  within a module unless a file exceeds ~300 lines.
- Test files mirror this exactly: `tests/<module>/<layer>.test.ts`.
  Integration (HTTP-level) tests live in `tests/<module>/routes.test.ts`;
  unit tests for business logic live in `tests/<module>/service.test.ts`.

## TypeScript Conventions

- `strict: true` is on. No `any` — if a type is genuinely dynamic, use
  `unknown` and narrow it.
- Union string literal types for enums (`type TaskStatus = "TODO" | ...`),
  matching the existing pattern in `activities/types.ts` — do not
  introduce a different enum style (e.g. TypeScript `enum`) partway
  through the codebase.
- Repository methods return `T | null` for single-record lookups, never
  `undefined` (matches existing `findById` methods).
- Service methods that can't find a record throw `NotFoundError`
  immediately rather than returning `null` and making the caller check.

## AppError Usage

- `ValidationError` for bad input (400), `NotFoundError` for missing
  records (404), `ConflictError` for state conflicts (409),
  `ForbiddenError`/`UnauthorizedError` for auth (403/401).
- If you need a new error shape (e.g., a specific SLA-escalation
  conflict), add a narrowly-named subclass to `src/shared/errors.ts`
  rather than reusing an existing one with a misleading message.

## EventBus Usage

- Event names are a closed union type in `src/shared/eventBus.ts`
  (`StoreOpsEventName`). Adding a new event means adding it to that
  union first — do not emit a string literal that isn't in the union
  (TypeScript will catch this, which is the point).
- Payloads should be small, serializable objects carrying IDs, not full
  entities — e.g. `{ taskId, storeId }`, not the entire `Task` object.
  This mirrors the existing `TASK_CREATED`/`TASK_UPDATED` payloads.
- Register new subscriptions in the consuming module's
  `registerEventSubscriptions()` method (see `alerts/service.ts` for
  the existing pattern), called once from `server.ts`'s `createApp()`.

## Router Usage

- Route handlers are `(req, res) => void | Promise<void>`. Throw
  `AppError` subclasses directly — the router's `handle()` method
  catches them and maps `statusCode`/`code` to the response
  automatically. Do not manually catch-and-format AppErrors in a route
  handler; that's already done centrally.
- Query params arrive as `req.query.<name>` (always `string | undefined`
  — validate presence explicitly, there's no automatic required-param
  mechanism).
- Path params arrive as `req.params.<name>` (always `string`, guaranteed
  present if the route matched).

## A Worked Example (from the baseline — follow this shape)

```ts
// routes.ts
router.patch("/api/activities/:id", (req, res) => {
  const body = req.body as UpdateTaskInput | undefined;
  if (!body || typeof body !== "object") {
    throw new ValidationError("request body is required");
  }
  const task = service.updateTask(req.params.id, body);
  res.status(200).json({ task });
});

// service.ts
updateTask(id: string, patch: UpdateTaskInput): Task {
  const existing = this.repo.findById(id);
  if (!existing) throw new NotFoundError(`Task ${id} not found`);
  const updated = this.repo.update(id, patch);
  if (!updated) throw new NotFoundError(`Task ${id} not found`);
  eventBus.emit("TASK_UPDATED", { taskId: updated.id, status: updated.status });
  return updated;
}
```
