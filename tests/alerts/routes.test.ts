import { describe, test } from "@jest/globals";
import assert from "node:assert";
import { createApp } from "../../src/server";
import request from "supertest";
import { eventBus } from "../../src/shared/eventBus";

describe("alerts routes: GET requires userId and returns notifications", () => {
  const app = createApp();

  test("GET /api/alerts without userId returns 400", async () => {
    const res = await request(app).get("/api/alerts");
    assert.strictEqual(res.status, 400);
  });

  test("SLA_BREACH event delivered via the bus creates a notification retrievable via the route", async () => {
    eventBus.emit("SLA_BREACH", {
      taskId: "task-1",
      departmentLeadId: "user-dept-lead-1",
      storeId: "store-1",
    });
    // allow the fire-and-forget listener a tick to run
    await new Promise<void>((resolve) => setImmediate(resolve));

    const res = await request(app).get("/api/alerts?userId=user-dept-lead-1");
    assert.strictEqual(res.status, 200);
    const body = res.body as { notifications: { alertType: string }[] };
    assert.ok(body.notifications.some((n) => n.alertType === "SLA_BREACH"));
  });

});
