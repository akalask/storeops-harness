import test from "node:test";
import assert from "node:assert";
import * as http from "node:http";
import { createApp } from "../../src/server";
import { request } from "../helpers/httpClient";

const TEST_PORT = 4101;
let server: http.Server;

test("activities routes: full CRUD lifecycle", async (t) => {
  const app = createApp();
  server = http.createServer((req, res) => {
    void app.handle(req, res);
  });
  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));

  await t.test("POST /api/activities creates a task and returns 201", async () => {
    const res = await request(TEST_PORT, "POST", "/api/activities", {
      storeId: "store-1",
      title: "Restock aisle 3",
      priority: "HIGH",
      category: "RESTOCKING",
    });
    assert.strictEqual(res.status, 201);
    const body = res.body as { task: { id: string; status: string } };
    assert.strictEqual(body.task.status, "TODO");
  });

  await t.test("GET /api/activities lists created tasks", async () => {
    const res = await request(TEST_PORT, "GET", "/api/activities");
    assert.strictEqual(res.status, 200);
    const body = res.body as { tasks: unknown[] };
    assert.ok(body.tasks.length >= 1);
  });

  await t.test("GET /api/activities/:id returns 404 AppError shape for unknown id", async () => {
    const res = await request(TEST_PORT, "GET", "/api/activities/does-not-exist");
    assert.strictEqual(res.status, 404);
    const body = res.body as { error: { code: string; statusCode: number } };
    assert.strictEqual(body.error.code, "NOT_FOUND");
  });

  await t.test("PATCH /api/activities/:id updates status", async () => {
    const created = await request(TEST_PORT, "POST", "/api/activities", {
      storeId: "store-1",
      title: "Planogram reset",
      priority: "MEDIUM",
      category: "PLANOGRAM",
    });
    const id = (created.body as { task: { id: string } }).task.id;

    const patched = await request(TEST_PORT, "PATCH", `/api/activities/${id}`, { status: "DONE" });
    assert.strictEqual(patched.status, 200);
    assert.strictEqual((patched.body as { task: { status: string } }).task.status, "DONE");
  });

  await t.test("DELETE /api/activities/:id returns 204", async () => {
    const created = await request(TEST_PORT, "POST", "/api/activities", {
      storeId: "store-1",
      title: "Temp task",
      priority: "LOW",
      category: "GENERAL",
    });
    const id = (created.body as { task: { id: string } }).task.id;

    const deleted = await request(TEST_PORT, "DELETE", `/api/activities/${id}`);
    assert.strictEqual(deleted.status, 204);
  });

  await t.test("POST /api/activities with missing title returns 400 ValidationError", async () => {
    const res = await request(TEST_PORT, "POST", "/api/activities", {
      storeId: "store-1",
      priority: "LOW",
      category: "GENERAL",
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_ERROR");
  });

  await new Promise<void>((resolve) => server.close(() => resolve()));
});
