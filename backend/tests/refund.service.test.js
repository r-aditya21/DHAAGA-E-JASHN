// Unit tests for the refund service. No database: the Order model's static
// methods and the Razorpay SDK are replaced, so these run anywhere.

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const sdk = { refundCalls: [], refundImpl: null };
const configPath = require.resolve("../config/razorpay");
require.cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: {
    getRazorpay: () => ({
      payments: {
        refund: async (paymentId, params) => {
          sdk.refundCalls.push({ paymentId, params });
          return sdk.refundImpl(paymentId, params);
        },
      },
    }),
  },
};

const Order = require("../models/Order");
const { refundPaidOrder, retryPendingRefunds, STALE_PROCESSING_MS } = require("../services/refund.service");

const paidCancelled = {
  _id: "64b000000000000000000001",
  orderNumber: "DHG-TEST-1",
  razorpayOrderId: "order_abc",
  paymentId: "pay_abc",
  totalAmount: 1098.5,
  paymentMethod: "razorpay",
  paymentStatus: "paid",
  orderStatus: "cancelled",
};

const real = {
  findOneAndUpdate: Order.findOneAndUpdate,
  updateOne: Order.updateOne,
  find: Order.find,
  log: console.log,
  error: console.error,
};

let claims;
let updates;
let logged;

beforeEach(() => {
  sdk.refundCalls = [];
  sdk.refundImpl = async () => ({ id: "rfnd_1" });
  claims = [];
  updates = [];
  logged = [];
  Order.findOneAndUpdate = async (filter, update) => {
    claims.push({ filter, update });
    return paidCancelled;
  };
  Order.updateOne = async (filter, update) => {
    updates.push({ filter, update });
    return { modifiedCount: 1 };
  };
  console.log = (line) => logged.push(String(line));
  console.error = (line) => logged.push(String(line));
});

afterEach(() => {
  Order.findOneAndUpdate = real.findOneAndUpdate;
  Order.updateOne = real.updateOne;
  Order.find = real.find;
  console.log = real.log;
  console.error = real.error;
});

describe("refundPaidOrder", () => {
  it("refunds the full amount in paise against the stored payment id and marks the order refunded", async () => {
    const result = await refundPaidOrder(paidCancelled._id, { reason: "admin_cancel" });

    assert.deepEqual(result, { status: "refunded", refundId: "rfnd_1" });
    assert.equal(sdk.refundCalls.length, 1);
    assert.equal(sdk.refundCalls[0].paymentId, "pay_abc");
    assert.equal(sdk.refundCalls[0].params.amount, 109850, "full total, in paise");
    assert.equal(sdk.refundCalls[0].params.receipt, "DHG-TEST-1");

    const set = updates.at(-1).update.$set;
    assert.equal(set.paymentStatus, "refunded");
    assert.equal(set.refundStatus, "succeeded");
    assert.equal(set.refundId, "rfnd_1");
  });

  it("only claims paid, cancelled Razorpay orders that have a payment id", async () => {
    await refundPaidOrder(paidCancelled._id);

    const { filter } = claims[0];
    assert.equal(filter.paymentMethod, "razorpay");
    assert.equal(filter.paymentStatus, "paid");
    assert.equal(filter.orderStatus, "cancelled");
    assert.deepEqual(filter.paymentId, { $ne: "" });
  });

  it("does not call Razorpay when another caller already claimed the refund", async () => {
    Order.findOneAndUpdate = async () => null;

    const result = await refundPaidOrder(paidCancelled._id);

    assert.deepEqual(result, { status: "skipped" });
    assert.equal(sdk.refundCalls.length, 0);
    assert.equal(updates.length, 0);
  });

  it("keeps the order paid and records the error when Razorpay fails, without throwing", async () => {
    sdk.refundImpl = async () => {
      throw { statusCode: 400, error: { description: "Insufficient balance for refund" } };
    };

    const result = await refundPaidOrder(paidCancelled._id);

    assert.equal(result.status, "failed");
    assert.match(result.error, /Insufficient balance/);

    const set = updates.at(-1).update.$set;
    assert.equal(set.refundStatus, "failed");
    assert.match(set.refundError, /Insufficient balance/);
    assert.equal(set.paymentStatus, undefined, "paymentStatus must stay paid so it can be retried");
  });

  it("treats 'already fully refunded' as success so a crashed attempt heals", async () => {
    sdk.refundImpl = async () => {
      throw { statusCode: 400, error: { description: "The payment has been fully refunded already" } };
    };

    const result = await refundPaidOrder(paidCancelled._id);

    assert.equal(result.status, "refunded");
    assert.equal(updates.at(-1).update.$set.paymentStatus, "refunded");
  });

  it("never throws when the database fails to claim or to save", async () => {
    Order.findOneAndUpdate = async () => {
      throw new Error("db down");
    };
    assert.equal((await refundPaidOrder(paidCancelled._id)).status, "failed");

    Order.findOneAndUpdate = async () => paidCancelled;
    Order.updateOne = async () => {
      throw new Error("db down while saving");
    };
    const result = await refundPaidOrder(paidCancelled._id);
    assert.equal(result.status, "failed", "refunded at Razorpay but unrecorded: reported, retried later");
  });

  it("logs structured events and never secrets", async () => {
    process.env.RAZORPAY_KEY_SECRET = "super-secret-value";
    await refundPaidOrder(paidCancelled._id, { reason: "admin_cancel" });

    const line = logged.find((l) => l.includes("refund_succeeded"));
    assert.ok(line, "success event logged");

    const entry = JSON.parse(line);
    assert.equal(entry.orderNumber, "DHG-TEST-1");
    assert.equal(entry.razorpayOrderId, "order_abc");
    assert.equal(entry.paymentId, "pay_abc");
    assert.equal(entry.refundId, "rfnd_1");
    assert.ok(!logged.join("\n").includes("super-secret-value"));
    delete process.env.RAZORPAY_KEY_SECRET;
  });
});

describe("retryPendingRefunds", () => {
  it("retries failed and stale-processing refunds only", async () => {
    let query;
    Order.find = (q) => {
      query = q;
      return { limit: () => ({ select: async () => [{ _id: paidCancelled._id }] }) };
    };

    const now = Date.now();
    const results = await retryPendingRefunds({ now });

    assert.equal(results.length, 1);
    assert.equal(results[0].status, "refunded");
    assert.equal(query.paymentStatus, "paid");
    assert.equal(query.orderStatus, "cancelled");
    assert.equal(query.$or[0].refundStatus, "failed");
    assert.equal(query.$or[1].refundStatus, "processing");
    assert.equal(query.$or[1].updatedAt.$lt.getTime(), now - STALE_PROCESSING_MS);
  });
});
