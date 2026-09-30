import test from "node:test";
import assert from "node:assert";
import { StaffRepository } from "../../src/staff/repository";
import { StaffService } from "../../src/staff/service";
import { NotFoundError } from "../../src/shared/errors";

test("getUser returns a seeded user", () => {
  const service = new StaffService(new StaffRepository());
  const user = service.getUser("user-dept-lead-1");
  assert.strictEqual(user.role, "DEPARTMENT_LEAD");
});

test("getUser throws NotFoundError for unknown id", () => {
  const service = new StaffService(new StaffRepository());
  try {
    service.getUser("nope");
    assert.fail("expected NotFoundError");
  } catch (err) {
    assert.ok(err instanceof NotFoundError);
  }
});

test("findUsersByRole finds the seeded Department Lead for store-1", () => {
  const service = new StaffService(new StaffRepository());
  const leads = service.findUsersByRole("store-1", "DEPARTMENT_LEAD");
  assert.strictEqual(leads.length, 1);
  assert.strictEqual(leads[0].id, "user-dept-lead-1");
});
