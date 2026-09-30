# Skill: How To Test

## Purpose

Tell the Generator exactly how StoreOps tests are written in this
repository, so tests it writes are indistinguishable in style from the
baseline's, and — critically — so they actually verify business rules
rather than just response shapes (this is failure mode #3 from the
client engagement: "tests that asserted HTTP status codes but did not
verify business rule compliance").

## Framework

`node:test` + `node:assert`, imported directly (no Jest, no supertest —
see `app-context/SKILL.md`). Two test styles exist in this codebase:

### Unit tests (business logic, no HTTP)

Instantiate the service directly against a fresh repository. See
`tests/activities/service.test.ts` for the pattern:

```ts
import test from "node:test";
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

Start a real server on a dedicated test port, use the
`tests/helpers/httpClient.ts` `request()` helper (NOT global `fetch` —
this project has no DOM lib types), and close the server at the end.
See `tests/activities/routes.test.ts` for the full pattern. **Each test
file that starts a server must use a port number not used by any other
test file** — check existing test files for ports already claimed
(4101, 4102, 4103 are taken as of the baseline; use 4104+ for new ones).

## The Rule That Matters Most: Test the Business Rule, Not the Shape

**Do not write a test that only checks a status code.** Every
acceptance criterion in the sprint contract names an observable outcome
— the test must assert that specific outcome.

```ts
// WEAK — this is exactly failure mode #3. Passes even if the SLA logic
// is completely wrong, as long as the endpoint returns 200.
test("bulk update endpoint works", async () => {
  const res = await request(PORT, "PATCH", "/api/activities/bulk-status", {...});
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

`eventBus` is a **process-wide singleton** (see
`src/shared/eventBus.ts`), not recreated per test. Tests that register
a listener (e.g., to capture emitted events) should register it inside
the test itself, on the shared `eventBus`, and should not assume no
other listeners exist — multiple `createApp()` calls across test files
in the same process each register their own subscriptions, so a test
asserting "exactly one notification was created" should query its own
service/repository state, not just count total emissions on the bus.
