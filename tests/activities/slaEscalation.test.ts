import { test } from "@jest/globals";
import assert from "node:assert";
import { ActivitiesRepository } from "../../src/activities/repository";
import { ActivitiesService } from "../../src/activities/service";
import { StaffRepository } from "../../src/staff/repository";
import { StaffService } from "../../src/staff/service";
import { eventBus, StoreOpsEvent } from "../../src/shared/eventBus";

function makeService() {
  const repo = new ActivitiesRepository();
  const staffService = new StaffService(new StaffRepository());
  return { service: new ActivitiesService(repo, staffService) };
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

function captureEscalations(): { taskId: string; storeManagerId: string; storeId: string }[] {
  const captured: { taskId: string; storeManagerId: string; storeId: string }[] = [];
  eventBus.on("SLA_ESCALATION", (e: StoreOpsEvent<{ taskId: string; storeManagerId: string; storeId: string }>) => {
    captured.push(e.payload);
  });
  return captured;
}

/** Helper: create a task and drive it through Sprint 1's breach detection so slaBreachDetectedAt is set. */
function createBreachedTask(
  service: ActivitiesService,
  breachedHoursAgo: number
) {
  const task = service.createTask({
    storeId: "store-1",
    title: "Breached task",
    priority: "CRITICAL",
    category: "AUDIT",
    dueDate: hoursAgo(breachedHoursAgo + 1).toISOString(), // due before it breached
  });
  // Run breach detection "as of" breachedHoursAgo in the past, so
  // slaBreachDetectedAt is set to that historical timestamp.
  service.checkSlaBreaches(hoursAgo(breachedHoursAgo));
  return task;
}

test("AC1: a breach unresolved past the grace period escalates exactly once, to the Store Manager", () => {
  const { service } = makeService();
  const captured = captureEscalations();
  const task = createBreachedTask(service, 10); // breached 10 hours ago

  service.checkSlaEscalations(new Date(), 4); // grace period 4 hours — well exceeded

  const matches = captured.filter((c) => c.taskId === task.id);
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].storeManagerId, "user-store-mgr-1");
});

test("AC2: an already-escalated breach does not escalate again on a second sweep", () => {
  const { service } = makeService();
  const captured = captureEscalations();
  const task = createBreachedTask(service, 10);

  service.checkSlaEscalations(new Date(), 4);
  service.checkSlaEscalations(new Date(), 4); // second sweep

  assert.strictEqual(captured.filter((c) => c.taskId === task.id).length, 1);
});

test("AC3: a breach still within the grace period does not escalate", () => {
  const { service } = makeService();
  const captured = captureEscalations();
  const task = createBreachedTask(service, 1); // breached only 1 hour ago

  service.checkSlaEscalations(new Date(), 4); // grace period 4 hours — not yet exceeded

  assert.strictEqual(captured.filter((c) => c.taskId === task.id).length, 0);
});

test("AC4: a breach that reached DONE does not escalate even after the grace period elapses", () => {
  const { service } = makeService();
  const captured = captureEscalations();
  const task = createBreachedTask(service, 10);
  service.updateTask(task.id, { status: "DONE" });

  service.checkSlaEscalations(new Date(), 4);

  assert.strictEqual(captured.filter((c) => c.taskId === task.id).length, 0);
});

test("AC5: a task never flagged as breached (slaBreachDetectedAt still null) is not considered for escalation", () => {
  const { service } = makeService();
  const captured = captureEscalations();
  // Created directly, never passed through checkSlaBreaches — dueDate far in the past
  // but breach detection was never run for it, so slaBreachDetectedAt stays null.
  const task = service.createTask({
    storeId: "store-1",
    title: "Never swept for breach",
    priority: "CRITICAL",
    category: "AUDIT",
    dueDate: hoursAgo(100).toISOString(),
  });

  service.checkSlaEscalations(new Date(), 4);

  assert.strictEqual(captured.filter((c) => c.taskId === task.id).length, 0);
});
