import { test } from "@jest/globals";
import assert from "node:assert";
import { ActivitiesRepository } from "../../src/activities/repository";
import { ActivitiesService } from "../../src/activities/service";
import { StaffRepository } from "../../src/staff/repository";
import { StaffService } from "../../src/staff/service";
import { NotFoundError, ValidationError } from "../../src/shared/errors";

function makeService() {
  return new ActivitiesService(new ActivitiesRepository(), new StaffService(new StaffRepository()));
}

test("createTask creates a task with TODO status by default", () => {
  const service = makeService();
  const task = service.createTask({
    storeId: "store-1",
    title: "Restock shelf 4",
    priority: "HIGH",
    category: "RESTOCKING",
  });
  assert.strictEqual(task.status, "TODO");
  assert.strictEqual(task.title, "Restock shelf 4");
});

test("createTask throws ValidationError (not a raw Error) for missing title", () => {
  const service = makeService();
  try {
    service.createTask({ storeId: "store-1", title: "", priority: "LOW", category: "GENERAL" });
    assert.fail("expected ValidationError to be thrown");
  } catch (err) {
    assert.ok(err instanceof ValidationError, "error must be a ValidationError, not a raw Error");
  }
});

test("getTask throws NotFoundError for unknown id", () => {
  const service = makeService();
  try {
    service.getTask("does-not-exist");
    assert.fail("expected NotFoundError to be thrown");
  } catch (err) {
    assert.ok(err instanceof NotFoundError);
  }
});

test("updateTask updates status and persists the change", () => {
  const service = makeService();
  const task = service.createTask({
    storeId: "store-1",
    title: "Compliance check",
    priority: "MEDIUM",
    category: "COMPLIANCE",
  });
  const updated = service.updateTask(task.id, { status: "IN_PROGRESS" });
  assert.strictEqual(updated.status, "IN_PROGRESS");
  assert.strictEqual(service.getTask(task.id).status, "IN_PROGRESS");
});

test("listTasks filters by status", () => {
  const service = makeService();
  service.createTask({ storeId: "store-1", title: "A", priority: "LOW", category: "GENERAL" });
  const t2 = service.createTask({ storeId: "store-1", title: "B", priority: "LOW", category: "GENERAL" });
  service.updateTask(t2.id, { status: "DONE" });

  const done = service.listTasks({ status: "DONE" });
  assert.strictEqual(done.length, 1);
  assert.strictEqual(done[0].id, t2.id);
});

test("deleteTask removes the task", () => {
  const service = makeService();
  const task = service.createTask({ storeId: "store-1", title: "Temp", priority: "LOW", category: "GENERAL" });
  service.deleteTask(task.id);
  try {
    service.getTask(task.id);
    assert.fail("expected NotFoundError after delete");
  } catch (err) {
    assert.ok(err instanceof NotFoundError);
  }
});
