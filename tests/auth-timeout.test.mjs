import assert from "node:assert/strict";
import test from "node:test";
import { withAuthTimeout } from "../lib/auth-timeout.ts";

test("auth requests release the UI when the account service stalls", async () => {
  await assert.rejects(
    withAuthTimeout(new Promise(() => undefined), 10),
    /took too long to respond/,
  );
});

test("auth requests return normally when the account service responds", async () => {
  assert.equal(await withAuthTimeout(Promise.resolve("ready"), 100), "ready");
});
