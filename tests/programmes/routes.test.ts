import { describe, test } from "@jest/globals";
import assert from "node:assert";
import { createApp } from "../../src/server";
import request from "supertest";

describe("programmes routes: create, list, add member", () => {
  const app = createApp();

  let programmeId = "";

  test("POST /api/programmes creates a programme", async () => {
    const res = await request(app).post("/api/programmes").send({
      storeId: "store-1",
      name: "Winter Seasonal Rollout",
    });
    assert.strictEqual(res.status, 201);
    const body = res.body as { project: { id: string; status: string } };
    assert.strictEqual(body.project.status, "OPEN");
    programmeId = body.project.id;
  });

  test("GET /api/programmes?storeId=... lists it", async () => {
    const res = await request(app).get("/api/programmes?storeId=store-1");
    assert.strictEqual(res.status, 200);
    const body = res.body as { projects: unknown[] };
    assert.ok(body.projects.length >= 1);
  });

  test("POST /api/programmes/:id/members adds a member", async () => {
    const res = await request(app).post(`/api/programmes/${programmeId}/members`).send({
      userId: "user-associate-1",
      role: "ASSOCIATE",
    });
    assert.strictEqual(res.status, 200);
    const body = res.body as { project: { members: unknown[] } };
    assert.strictEqual(body.project.members.length, 1);
  });

  test("POST /api/programmes/:id/members with invalid role returns 400", async () => {
    const res = await request(app).post(`/api/programmes/${programmeId}/members`).send({
      userId: "user-x",
      role: "NOT_A_ROLE",
    });
    assert.strictEqual(res.status, 400);
  });

});
