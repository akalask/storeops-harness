# StoreOps API and Harness

StoreOps is a reference REST API for retail store operations. It includes operational activities, store programmes, staff lookups, alerts, and a governed AI-assisted feature-development harness.

## Features

- Create and manage store activities, including priority, status, due dates, and optional programme or assignee links.
- Create programmes and add staff members.
- List user notifications, including SLA breach and escalation notifications.
- Check overdue high-priority activities and escalate unresolved breaches after a grace period.
- Keep module responsibilities explicit with repository, service, and route layers, plus an EventBus for cross-module side effects.
- Use Planner, Generator, Evaluator, and Monitor agents to plan, implement, validate, and record feature work.

## Requirements

- Node.js 20.19 or newer
- npm

## Run Locally

From the repository root:

```bash
npm ci
npm run verify
npm start
```

The API listens on `http://localhost:3000` by default. Set `PORT` to use another port. The root endpoint returns a short JSON index, and `/health` is a liveness check.

```bash
curl http://localhost:3000/
curl http://localhost:3000/health
```

For PowerShell, use `curl.exe` if the `curl` alias is mapped to `Invoke-WebRequest`.

## API

All request and response bodies are JSON. Successful responses are JSON except `DELETE /api/activities/:id`, which returns `204 No Content`. Errors use a consistent envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "statusCode": 400
  }
}
```

### Activities

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/activities` | List activities. Optional filters: `programmeId`, `status`. |
| `POST` | `/api/activities` | Create an activity. Required: `storeId`, `title`, `priority`, `category`. Optional: `programmeId`, `assigneeId`, `dueDate`. |
| `GET` | `/api/activities/:id` | Get one activity. |
| `PATCH` | `/api/activities/:id` | Update supported activity fields, such as `status`. |
| `DELETE` | `/api/activities/:id` | Delete an activity. |
| `POST` | `/api/activities/run-sla-sweep` | Run breach detection and escalation. Optional `gracePeriodHours` defaults to `4`. |

Activity priorities are `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`. Categories are `RESTOCKING`, `PLANOGRAM`, `AUDIT`, `COMPLIANCE`, and `GENERAL`. Statuses are `TODO`, `IN_PROGRESS`, `DONE`, and `BLOCKED`.

Create an activity:

```bash
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{"storeId":"store-1","title":"Check aisle 3","priority":"HIGH","category":"RESTOCKING","dueDate":"2026-10-01T12:00:00.000Z"}'
```

Run an SLA sweep and list the Department Lead's alerts:

```bash
curl -X POST http://localhost:3000/api/activities/run-sla-sweep \
  -H "Content-Type: application/json" \
  -d '{"gracePeriodHours":4}'

curl "http://localhost:3000/api/alerts?userId=user-dept-lead-1"
```

The sweep checks for overdue `HIGH` and `CRITICAL` activities that have not reached `DONE`. It notifies the assigned store's Department Lead once per breach, then escalates an unresolved breach to the Store Manager once the grace period has elapsed.

### Programmes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/programmes?storeId=:storeId` | List programmes for a store. `storeId` is required. |
| `POST` | `/api/programmes` | Create a programme. Required: `storeId`, `name`. Optional: `description`. |
| `POST` | `/api/programmes/:id/members` | Add a member. Required: `userId`, `role`. |

### Alerts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/alerts?userId=:userId` | List notifications for a user. `userId` is required. |

This is a reference application: `userId` and `storeId` are supplied as request parameters for demonstration and are not authentication or authorization controls.

## Development

| Command | Purpose |
|---|---|
| `npm run build` | Compile TypeScript into `dist/`. |
| `npm run typecheck` | Type-check source and tests without emitting files. |
| `npm run lint` | Run ESLint and dependency-cruiser architecture checks. |
| `npm test` | Build and run the Jest test suite. |
| `npm run verify` | Run typecheck, lint, and tests. |
| `npm start` | Build and start the API. |

The project uses Express, TypeScript, Jest, and supertest. Tests are under `tests/`; the source is under `src/`. ESLint and dependency-cruiser enforce these architecture rules:

1. A module cannot import another module's repository directly.
2. Cross-module service side effects use the EventBus. The `staff` service is the read-only lookup exception.
3. Services and route handlers must throw `AppError` subclasses rather than raw `Error` instances.
4. Routes call services rather than repositories; repositories must not depend on HTTP code.
5. The reports module cannot import another module's repository.

## Feature Harness

Harness definitions and project-specific instructions live in `.harness/`. To start a feature run, ask the Planner:

```text
@planner <describe the feature>
```

The Planner writes a specification and sprint contracts. Review the specification and reply `APPROVED` before implementation proceeds. The Generator then implements a sprint, the Evaluator runs the hard gates and reviews its acceptance-criteria coverage, and the Monitor records the result. The orchestration flow, retry limit, and handoff files are described in [CLAUDE.md](CLAUDE.md).

The sample feature prompt is in [PROMPT.md](PROMPT.md); rationale and design decisions are documented in [DESIGN_BRIEF.md](DESIGN_BRIEF.md).

## Runtime Notes

- Data is stored in memory and resets when the process restarts. There is no database.
- The app does not provide production authentication or authorization.
- The event bus is process-local; it is not a distributed message broker.
- Docker configuration is included. See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment notes; the Docker path has not been verified as part of the local npm verification workflow.
