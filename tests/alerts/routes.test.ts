import test from "node:test";
import assert from "node:assert";
import * as http from "node:http";
import { createApp } from "../../src/server";
import { request } from "../helpers/httpClient";
import { eventBus } from "../../src/shared/eventBus";

const TEST_PORT = 4103;

test("alerts routes: GET requires userId and returns notifications", async (t) => {
  const app = createApp();
  const server = http.createServer((req, res) => {
    void app.handle(req, res);
  });
  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));

  await t.test("GET /api/alerts without userId returns 400", async () => {
    const res = await request(TEST_PORT, "GET", "/api/alerts");
    assert.strictEqual(res.status, 400);
  });

  await t.test("SLA_BREACH event delivered via the bus creates a notification retrievable via the route", async () => {
    eventBus.emit("SLA_BREACH", {
      taskId: "task-1",
      departmentLeadId: "user-dept-lead-1",
      storeId: "store-1",
    });
    // allow the fire-and-forget listener a tick to run
    await new Promise<void>((resolve) => setImmediate(resolve));

    const res = await request(TEST_PORT, "GET", "/api/alerts?userId=user-dept-lead-1");
    assert.strictEqual(res.status, 200);
    const body = res.body as { notifications: { alertType: string }[] };
    assert.ok(body.notifications.some((n) => n.alertType === "SLA_BREACH"));
  });

  await new Promise<void>((resolve) => server.close(() => resolve()));
});
