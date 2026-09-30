# Skill: How To Test

## Purpose

Tell the Generator exactly how StoreOps tests are written in this
repository, so tests it writes are indistinguishable in style from the
baseline's, and — critically — so they actually verify business rules
rather than just response shapes (this is failure mode #3 from the
client engagement: "tests that asserted HTTP status codes but did not
verify business rule compliance").

## Framework

Jest provides the test runner and `node:assert` provides assertions.
Import test functions from `@jest/globals`. Two test styles exist in
this codebase:

### Unit tests (business logic, no HTTP)

Instantiate the service directly against a fresh repository. See
`tests/activities/service.test.ts` for the pattern:

```ts
import { test } from "@jest/globals";
import assert from "node:assert";
import { ActivitiesRepository } from "../../src/activities/repository";
import { ActivitiesService } from "../../src/activities/service";

function makeService() {
  return new ActivitiesService(new ActivitiesRepository());
}

test("createTask throws ValidationError (not a raw Error) for missing title", () => {
  const service = makeService();
  try {
    service.createTask({ storeId: "store-1", title: "", priority: "LOW", category: "GENERAL" });
    assert.fail("expected ValidationError to be thrown");
  } catch (err) {
    assert.ok(err instanceof ValidationError);
  }
});
```

### Integration tests (HTTP-level, via the real router)

Use supertest directly against the Express app; it manages the temporary
server, so tests need no fixed ports or explicit server cleanup. See
`tests/activities/routes.test.ts` for the full pattern:

```ts
import { describe, test } from "@jest/globals";
import assert from "node:assert";
import request from "supertest";
import { createApp } from "../../src/server";

describe("activities routes", () => {
  const app = createApp();
  test("creates a task", async () => {
    const response = await request(app)
      .post("/api/activities")
      .send({ storeId: "store-1", title: "Restock", priority: "HIGH", category: "RESTOCKING" });
    assert.strictEqual(response.status, 201);
  });
});
```

## The Rule That Matters Most: Test the Business Rule, Not the Shape

**Do not write a test that only checks a status code.** Every
acceptance criterion in the sprint contract names an observable outcome
— the test must assert that specific outcome.

```ts
// WEAK — this is exactly failure mode #3. Passes even if the SLA logic
// is completely wrong, as long as the endpoint returns 200.
test("bulk update endpoint works", async () => {
  const res = await request(app).patch("/api/activities/bulk-status").send({...});
  assert.strictEqual(res.status, 200);
});

// CORRECT — asserts the actual GIVEN/WHEN/THEN from the sprint contract
test("GIVEN a CRITICAL task past due WHEN the SLA sweep runs THEN an SLA_BREACH event is emitted with the correct departmentLeadId", () => {
  const { service, repo } = makeServiceWithOverdueTask({ priority: "CRITICAL" });
  const emitted: unknown[] = [];
  eventBus.on("SLA_BREACH", (e) => emitted.push(e.payload));
  service.sweepForSlaBreaches(new Date());
  assert.strictEqual(emitted.length, 1);
  assert.strictEqual((emitted[0] as any).departmentLeadId, "user-dept-lead-1");
});
```

## Coverage Expectation

Every acceptance criterion in the sprint contract needs at least one
test that would fail if that specific criterion were broken (not just
one that would fail if the whole feature were deleted). If you're
unsure whether a test actually pins down the criterion, ask: "if I
reverted just the business-rule check but kept the endpoint returning
200, would this test still pass?" If yes, the test is too weak — this
is the exact question the Evaluator's Acceptance Criteria Coverage
dimension asks too.

## Test Isolation Note

`eventBus` is a **process-wide singleton within a Jest test environment**
(see `src/shared/eventBus.ts`), not recreated per test. Tests that
register a listener (e.g., to capture emitted events) should register it
inside the test itself and should not assume no other listeners exist.
Multiple `createApp()` calls in one test environment each register
subscriptions, so a test asserting "exactly one notification was
created" should query its own service/repository state, not just count
total emissions on the bus.
