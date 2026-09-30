import { test } from "@jest/globals";
import assert from "node:assert";
import { ActivitiesRepository } from "../../src/activities/repository";
import { ActivitiesService } from "../../src/activities/service";
import { StaffRepository } from "../../src/staff/repository";
import { StaffService } from "../../src/staff/service";
import { eventBus, StoreOpsEvent } from "../../src/shared/eventBus";
import { TaskPriority } from "../../src/activities/types";

function makeService() {
  const repo = new ActivitiesRepository();
  const staffService = new StaffService(new StaffRepository());
  return { service: new ActivitiesService(repo, staffService), repo };
}

function pastDate(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}
function futureDate(hoursAhead: number): string {
  return new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();
}

function captureSlaBreachEvents(): { taskId: string; departmentLeadId: string; storeId: string }[] {
  const captured: { taskId: string; departmentLeadId: string; storeId: string }[] = [];
  eventBus.on("SLA_BREACH", (e: StoreOpsEvent<{ taskId: string; departmentLeadId: string; storeId: string }>) => {
    captured.push(e.payload);
  });
  return captured;
}

test("AC1: CRITICAL overdue task emits exactly one SLA_BREACH event", () => {
  const { service } = makeService();
  const captured = captureSlaBreachEvents();
  const task = service.createTask({
    storeId: "store-1",
    title: "Critical audit",
    priority: "CRITICAL",
    category: "AUDIT",
    dueDate: pastDate(2),
  });

  service.checkSlaBreaches(new Date());

  const matches = captured.filter((c) => c.taskId === task.id);
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].departmentLeadId, "user-dept-lead-1");
});

test("AC2: an already-notified breach does not fire a duplicate SLA_BREACH on a second sweep", () => {
  const { service } = makeService();
  const captured = captureSlaBreachEvents();
  const task = service.createTask({
    storeId: "store-1",
    title: "Critical restock",
    priority: "CRITICAL",
    category: "RESTOCKING",
    dueDate: pastDate(5),
  });

  service.checkSlaBreaches(new Date());
  service.checkSlaBreaches(new Date()); // second sweep, same unresolved breach

  const matches = captured.filter((c) => c.taskId === task.id);
  assert.strictEqual(matches.length, 1, "expected exactly one notification across two sweeps");
});

test("AC3: LOW/MEDIUM priority overdue tasks do not trigger SLA_BREACH", () => {
  const { service } = makeService();
  const captured = captureSlaBreachEvents();
  const lowTask = service.createTask({
    storeId: "store-1",
    title: "Low priority cleanup",
    priority: "LOW" as TaskPriority,
    category: "GENERAL",
    dueDate: pastDate(10),
  });
  const mediumTask = service.createTask({
    storeId: "store-1",
    title: "Medium priority check",
    priority: "MEDIUM" as TaskPriority,
    category: "GENERAL",
    dueDate: pastDate(10),
  });

  service.checkSlaBreaches(new Date());

  assert.strictEqual(captured.filter((c) => c.taskId === lowTask.id).length, 0);
  assert.strictEqual(captured.filter((c) => c.taskId === mediumTask.id).length, 0);
});

test("AC4: HIGH priority task with a future due date does not trigger SLA_BREACH", () => {
  const { service } = makeService();
  const captured = captureSlaBreachEvents();
  const task = service.createTask({
    storeId: "store-1",
    title: "Not yet due",
    priority: "HIGH",
    category: "COMPLIANCE",
    dueDate: futureDate(24),
  });

  service.checkSlaBreaches(new Date());

  assert.strictEqual(captured.filter((c) => c.taskId === task.id).length, 0);
});

test("AC5: CRITICAL task that is already DONE does not trigger SLA_BREACH even if past due", () => {
  const { service } = makeService();
  const captured = captureSlaBreachEvents();
  const task = service.createTask({
    storeId: "store-1",
    title: "Finished despite being late",
    priority: "CRITICAL",
    category: "AUDIT",
    dueDate: pastDate(3),
  });
  service.updateTask(task.id, { status: "DONE" });

  service.checkSlaBreaches(new Date());

  assert.strictEqual(captured.filter((c) => c.taskId === task.id).length, 0);
});

test("AC6: a breach with no Department Lead for the store does not crash the whole sweep with a raw Error", () => {
  const { service } = makeService();
  const task = service.createTask({
    storeId: "store-with-no-leads", // no seeded staff for this store
    title: "Orphaned critical task",
    priority: "CRITICAL",
    category: "AUDIT",
    dueDate: pastDate(1),
  });

  // This assertion is intentionally about the ERROR TYPE, matching Rule 3
  // (Error Contract): if the Generator throws, it must be an AppError
  // subclass, not a raw Error. See sprint-1-contract.md AC6.
  try {
    service.checkSlaBreaches(new Date());
  } catch (err) {
    assert.ok(
      err instanceof Error && err.constructor.name !== "Error",
      "if checkSlaBreaches throws for a missing Department Lead, it must throw an AppError subclass, not a raw Error"
    );
  }
  void task;
});
