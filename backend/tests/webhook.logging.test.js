// Unit tests for webhook logging and failure handling. No database: the Order
// model and order service are stubbed.
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_unit_test";

const svcPath = require.resolve("../services/order.service");
// The controller destructures these at import time, so the exported functions
// must be stable; tests swap the implementation behind them.
const svc = { markOrderPaidImpl: async () => ({}) };
require.cache[svcPath] = {
  id: svcPath,
  filename: svcPath,
  loaded: true,
  exports: {
    markOrderPaid: (...args) => svc.markOrderPaidImpl(...args),
    clearCart: async () => {},
  },
};

const Order = require("../models/Order");
const { razorpayWebhook } = require("../controllers/razorpayWebhook.controller");

const realLog = console.log;
const realError = console.error;
const realFindOne = Order.findOne;
let logged;

beforeEach(() => {
  logged = [];
  svc.markOrderPaidImpl = async () => ({});
  console.log = (l) => logged.push(String(l));
  console.error = (l) => logged.push(String(l));
});
afterEach(() => {
  console.log = realLog;
  console.error = realError;
  Order.findOne = realFindOne;
});

const run = async (payload, { signature } = {}) => {
  const raw = Buffer.from(JSON.stringify(payload));
  const sig =
    signature ??
    crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest("hex");
  const res = {
    statusCode: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let nextError = null;
  await razorpayWebhook(
    { body: raw, ip: "1.2.3.4", get: () => sig },
    res,
    (error) => { nextError = error; }
  );
  return { res, nextError };
};

const captured = (amount) => ({
  event: "payment.captured",
  payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount, currency: "INR" } } },
});
const order = { _id: "o1", orderNumber: "DHG-1", user: "u1", totalAmount: 500 };
const events = () => logged.map((l) => JSON.parse(l).event);

describe("razorpay webhook logging", () => {
  it("logs and rejects a bad signature", async () => {
    const { res } = await run(captured(50000), { signature: "deadbeef" });
    assert.equal(res.statusCode, 400);
    assert.ok(events().includes("webhook_signature_invalid"));
    assert.ok(!logged.join("").includes("deadbeef"), "signature itself is never logged");
  });

  it("logs an amount mismatch and does not finalise the order", async () => {
    Order.findOne = async () => order;
    let finalised = false;
    svc.markOrderPaidImpl = async () => { finalised = true; return {}; };

    const { res } = await run(captured(99999));

    assert.equal(res.statusCode, 200);
    assert.equal(finalised, false);
    const entry = JSON.parse(logged.find((l) => l.includes("webhook_amount_mismatch")));
    assert.equal(entry.expectedPaise, 50000);
    assert.equal(entry.receivedPaise, 99999);
    assert.equal(entry.paymentId, "pay_1");
  });

  it("logs the outcome when a captured payment is processed", async () => {
    Order.findOne = async () => order;
    svc.markOrderPaidImpl = async () => ({ _id: "o1" });

    await run(captured(50000));

    const entry = JSON.parse(logged.find((l) => l.includes("webhook_captured_processed")));
    assert.equal(entry.outcome, "finalised");
    assert.equal(entry.razorpayOrderId, "order_1");
  });

  it("logs processing errors and passes them on so Razorpay retries", async () => {
    Order.findOne = async () => order;
    svc.markOrderPaidImpl = async () => { throw new Error("db unavailable"); };

    const { nextError } = await run(captured(50000));

    assert.equal(nextError.message, "db unavailable");
    const entry = JSON.parse(logged.find((l) => l.includes("webhook_processing_failed")));
    assert.match(entry.error, /db unavailable/);
  });
});
