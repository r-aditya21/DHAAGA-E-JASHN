const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { sanitize, describeError } = require("../utils/logger");

describe("payment logger", () => {
  it("drops secrets, signatures, tokens and card data but keeps ids", () => {
    const clean = sanitize({
      orderId: "o1",
      razorpayOrderId: "order_1",
      paymentId: "pay_1",
      razorpay_signature: "sig",
      RAZORPAY_KEY_SECRET: "s",
      webhookSecret: "w",
      authToken: "t",
      cardNumber: "4111111111111111",
      cvv: "123",
      key_id: "rzp_test_x",
      amountPaise: 100,
    });

    assert.deepEqual(clean, {
      orderId: "o1",
      razorpayOrderId: "order_1",
      paymentId: "pay_1",
      key_id: "rzp_test_x",
      amountPaise: 100,
    });
  });

  it("truncates long values and reads Razorpay SDK error shapes", () => {
    assert.equal(sanitize({ error: "x".repeat(1000) }).error.length, 300);
    assert.equal(describeError({ error: { description: "bad request" } }), "bad request");
    assert.equal(describeError(new Error("boom")), "boom");
  });
});
