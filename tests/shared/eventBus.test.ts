import { test } from "@jest/globals";
import assert from "node:assert";
import { EventBus } from "../../src/shared/eventBus";

test("EventBus delivers emitted events to registered listeners", () => {
  const bus = new EventBus();
  let received: unknown = null;
  bus.on("TASK_CREATED", (event) => {
    received = event.payload;
  });
  bus.emit("TASK_CREATED", { taskId: "abc" });
  assert.deepStrictEqual(received, { taskId: "abc" });
});

test("EventBus records every emitted event in its log for observability", () => {
  const bus = new EventBus();
  bus.emit("TASK_UPDATED", { taskId: "1" });
  bus.emit("SLA_BREACH", { taskId: "2" });
  assert.strictEqual(bus.log.length, 2);
  assert.strictEqual(bus.log[1].name, "SLA_BREACH");
});

test("EventBus does not throw when no listeners are registered for an event", () => {
  const bus = new EventBus();
  bus.emit("PROGRAMME_CLOSED", { projectId: "p1" }); // would throw on its own if broken
  assert.strictEqual(bus.log.length, 1);
});
