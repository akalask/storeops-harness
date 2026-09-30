import test from "node:test";
import assert from "node:assert";
import * as http from "node:http";
import { createApp } from "../../src/server";
import { request } from "../helpers/httpClient";

const TEST_PORT = 4102;

test("programmes routes: create, list, add member", async (t) => {
  const app = createApp();
  const server = http.createServer((req, res) => {
    void app.handle(req, res);
  });
  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));

  let programmeId = "";

  await t.test("POST /api/programmes creates a programme", async () => {
    const res = await request(TEST_PORT, "POST", "/api/programmes", {
      storeId: "store-1",
      name: "Winter Seasonal Rollout",
    });
    assert.strictEqual(res.status, 201);
    const body = res.body as { project: { id: string; status: string } };
    assert.strictEqual(body.project.status, "OPEN");
    programmeId = body.project.id;
  });

  await t.test("GET /api/programmes?storeId=... lists it", async () => {
    const res = await request(TEST_PORT, "GET", "/api/programmes?storeId=store-1");
    assert.strictEqual(res.status, 200);
    const body = res.body as { projects: unknown[] };
    assert.ok(body.projects.length >= 1);
  });

  await t.test("POST /api/programmes/:id/members adds a member", async () => {
    const res = await request(TEST_PORT, "POST", `/api/programmes/${programmeId}/members`, {
      userId: "user-associate-1",
      role: "ASSOCIATE",
    });
    assert.strictEqual(res.status, 200);
    const body = res.body as { project: { members: unknown[] } };
    assert.strictEqual(body.project.members.length, 1);
  });

  await t.test("POST /api/programmes/:id/members with invalid role returns 400", async () => {
    const res = await request(TEST_PORT, "POST", `/api/programmes/${programmeId}/members`, {
      userId: "user-x",
      role: "NOT_A_ROLE",
    });
    assert.strictEqual(res.status, 400);
  });

  await new Promise<void>((resolve) => server.close(() => resolve()));
});
