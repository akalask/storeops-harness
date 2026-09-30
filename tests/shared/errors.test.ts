import { test } from "@jest/globals";
import assert from "node:assert";
import { NotFoundError, ValidationError, isAppError } from "../../src/shared/errors";

test("NotFoundError has the correct statusCode and code", () => {
  const err = new NotFoundError("Task xyz not found");
  assert.strictEqual(err.statusCode, 404);
  assert.strictEqual(err.code, "NOT_FOUND");
  assert.ok(isAppError(err));
});

test("ValidationError serializes fieldErrors", () => {
  const err = new ValidationError("bad input", { title: "required" });
  const json = err.toJSON();
  assert.strictEqual(json.error.statusCode, 400);
  assert.strictEqual(err.fieldErrors?.title, "required");
});

test("a plain Error is NOT recognized as an AppError", () => {
  const err = new Error("raw error");
  assert.strictEqual(isAppError(err), false);
});
