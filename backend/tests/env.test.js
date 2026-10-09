const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { getAllowedOrigins } = require("../config/env");

describe("getAllowedOrigins", () => {
  it("allows local storefront origins outside production", () => {
    const originalClientUrl = process.env.CLIENT_URL;
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      process.env.CLIENT_URL = "https://store.example/";
      process.env.NODE_ENV = "development";

      assert.deepEqual(getAllowedOrigins(), [
        "https://store.example",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ]);
    } finally {
      if (originalClientUrl === undefined) delete process.env.CLIENT_URL;
      else process.env.CLIENT_URL = originalClientUrl;

      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("does not add local storefront origins in production", () => {
    const originalClientUrl = process.env.CLIENT_URL;
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      process.env.CLIENT_URL = "https://store.example";
      process.env.NODE_ENV = "production";

      assert.deepEqual(getAllowedOrigins(), ["https://store.example"]);
    } finally {
      if (originalClientUrl === undefined) delete process.env.CLIENT_URL;
      else process.env.CLIENT_URL = originalClientUrl;

      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
