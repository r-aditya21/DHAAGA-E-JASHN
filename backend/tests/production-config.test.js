// Production configuration checklist, enforced as tests. No database.
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const envModule = path.join(__dirname, "../config/env.js");

const validProduction = {
  NODE_ENV: "production",
  MONGODB_URI: "mongodb://example/db",
  JWT_SECRET: "x".repeat(32),
  CLIENT_URL: "https://store.example",
  GOOGLE_CLIENT_ID: "id.apps.googleusercontent.com",
  RAZORPAY_KEY_ID: "rzp_test_dummy",
  RAZORPAY_KEY_SECRET: "dummy-secret",
  RAZORPAY_WEBHOOK_SECRET: "dummy-webhook-secret",
};

// Runs validateEnv() in a clean child process (it calls process.exit(1)).
const validate = (overrides) => {
  const env = { PATH: process.env.PATH, ...validProduction, ...overrides };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete env[key];
  }

  const result = spawnSync(
    process.execPath,
    ["-e", `require(${JSON.stringify(envModule)}).validateEnv()`],
    { env, encoding: "utf8" }
  );

  return { code: result.status, output: result.stdout + result.stderr };
};

describe("production env validation", () => {
  it("accepts a complete production configuration", () => {
    assert.equal(validate({}).code, 0);
  });

  it("refuses to start without CLIENT_URL, Razorpay keys or the webhook secret", () => {
    for (const key of ["CLIENT_URL", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]) {
      const result = validate({ [key]: undefined });
      assert.equal(result.code, 1, `${key} must be required`);
      assert.match(result.output, new RegExp(key));
    }
  });

  it("refuses a JWT_SECRET shorter than 32 characters", () => {
    const result = validate({ JWT_SECRET: "short-secret" });
    assert.equal(result.code, 1);
    assert.match(result.output, /32 characters/);
  });

  it("warns (but starts) when GOOGLE_CLIENT_ID is missing", () => {
    const result = validate({ GOOGLE_CLIENT_ID: undefined });
    assert.equal(result.code, 0);
    assert.match(result.output, /GOOGLE_CLIENT_ID/);
  });
});

describe("auth cookie settings", () => {
  const { getCookieOptions } = require("../utils/cookies");

  const withEnv = (vars, fn) => {
    const saved = {};
    for (const [key, value] of Object.entries(vars)) {
      saved[key] = process.env[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    try {
      return fn();
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  };

  it("is httpOnly and Secure in production", () => {
    const options = withEnv({ NODE_ENV: "production", COOKIE_SAMESITE: undefined }, getCookieOptions);
    assert.equal(options.httpOnly, true);
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, "lax");
  });

  it("forces Secure when SameSite=None (cross-site storefront)", () => {
    const options = withEnv({ NODE_ENV: "development", COOKIE_SAMESITE: "none" }, getCookieOptions);
    assert.equal(options.sameSite, "none");
    assert.equal(options.secure, true);
  });

  it("falls back to lax for unknown values", () => {
    const options = withEnv({ NODE_ENV: "development", COOKIE_SAMESITE: "bogus" }, getCookieOptions);
    assert.equal(options.sameSite, "lax");
  });
});
