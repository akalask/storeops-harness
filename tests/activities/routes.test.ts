import { describe, test } from "@jest/globals";
import assert from "node:assert";
import { createApp } from "../../src/server";
import request from "supertest";

describe("activities routes: full CRUD lifecycle", () => {
  const app = createApp();

  test("GET / describes the API and its entry points", async () => {
    const res = await request(app).get("/");
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, {
      name: "StoreOps API",
      status: "ok",
      endpoints: {
        health: "/health",
        activities: "/api/activities",
        programmes: "/api/programmes",
        alerts: "/api/alerts",
      },
    });
  });

  test("POST /api/activities creates a task and returns 201", async () => {
    const res = await request(app).post("/api/activities").send({
      storeId: "store-1",
      title: "Restock aisle 3",
      priority: "HIGH",
      category: "RESTOCKING",
    });
    assert.strictEqual(res.status, 201);
    const body = res.body as { task: { id: string; status: string } };
    assert.strictEqual(body.task.status, "TODO");
  });

  test("GET /api/activities lists created tasks", async () => {
    const res = await request(app).get("/api/activities");
    assert.strictEqual(res.status, 200);
    const body = res.body as { tasks: unknown[] };
    assert.ok(body.tasks.length >= 1);
  });

  test("GET /api/activities/:id returns 404 AppError shape for unknown id", async () => {
    const res = await request(app).get("/api/activities/does-not-exist");
    assert.strictEqual(res.status, 404);
    const body = res.body as { error: { code: string; statusCode: number } };
    assert.strictEqual(body.error.code, "NOT_FOUND");
  });

  test("PATCH /api/activities/:id updates status", async () => {
    const created = await request(app).post("/api/activities").send({
      storeId: "store-1",
      title: "Planogram reset",
      priority: "MEDIUM",
      category: "PLANOGRAM",
    });
    const id = (created.body as { task: { id: string } }).task.id;

    const patched = await request(app).patch(`/api/activities/${id}`).send({ status: "DONE" });
    assert.strictEqual(patched.status, 200);
    assert.strictEqual((patched.body as { task: { status: string } }).task.status, "DONE");
  });

  test("DELETE /api/activities/:id returns 204", async () => {
    const created = await request(app).post("/api/activities").send({
      storeId: "store-1",
      title: "Temp task",
      priority: "LOW",
      category: "GENERAL",
    });
    const id = (created.body as { task: { id: string } }).task.id;

    const deleted = await request(app).delete(`/api/activities/${id}`);
    assert.strictEqual(deleted.status, 204);
  });

  test("POST /api/activities with missing title returns 400 ValidationError", async () => {
    const res = await request(app).post("/api/activities").send({
      storeId: "store-1",
      priority: "LOW",
      category: "GENERAL",
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual((res.body as { error: { code: string } }).error.code, "VALIDATION_ERROR");
  });

});
