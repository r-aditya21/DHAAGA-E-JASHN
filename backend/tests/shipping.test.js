// Pure unit tests (no database needed).
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateShipping,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
} = require("../config/constants");

describe("calculateShipping", () => {
  it("is free for an empty cart and at or above the threshold", () => {
    assert.equal(calculateShipping(0), 0);
    assert.equal(calculateShipping(FREE_SHIPPING_THRESHOLD), 0);
    assert.equal(calculateShipping(FREE_SHIPPING_THRESHOLD + 1), 0);
  });

  it("charges the flat fee just below the threshold", () => {
    assert.equal(calculateShipping(1), SHIPPING_FEE);
    assert.equal(calculateShipping(FREE_SHIPPING_THRESHOLD - 1), SHIPPING_FEE);
  });
});
