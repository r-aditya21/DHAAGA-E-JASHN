// Unit test for the rate limiter (express-rate-limit). No database.
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createRateLimiter } = require("../middleware/rateLimit.middleware");

describe("rate limiter", () => {
  it("allows up to the limit, then answers 429 JSON with Retry-After", async () => {
    const app = express();
    app.use(createRateLimiter({ windowMs: 60_000, max: 2, message: "Slow down" }));
    app.get("/", (req, res) => res.json({ ok: true }));

    const server = app.listen(0);
    const url = `http://127.0.0.1:${server.address().port}/`;

    try {
      assert.equal((await fetch(url)).status, 200);
      assert.equal((await fetch(url)).status, 200);

      const blocked = await fetch(url);
      assert.equal(blocked.status, 429);
      assert.deepEqual(await blocked.json(), { message: "Slow down" });
      assert.ok(Number(blocked.headers.get("retry-after")) > 0);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
