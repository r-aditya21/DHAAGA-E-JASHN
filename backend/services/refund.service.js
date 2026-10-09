const Order = require("../models/Order");
const { getRazorpay } = require("../config/razorpay");
const { paymentLog, describeError } = require("../utils/logger");

// A refund stuck in "processing" this long is assumed to have crashed midway
// and may be retried. Safe: Razorpay rejects a second full refund, which we
// treat as success (see isAlreadyRefunded).
const STALE_PROCESSING_MS = 10 * 60 * 1000;

const isAlreadyRefunded = (error) =>
  /fully refunded|already (been )?(fully )?refunded/i.test(describeError(error));

// Refunds the full amount of a PAID Razorpay order that has been cancelled.
//
// - Compare-and-set claim, so two callers cannot both issue a refund.
// - Never throws: a failure is recorded on the order (refundStatus "failed",
//   paymentStatus stays "paid") so nothing is lost and it can be retried.
// - Returns { status: "refunded" | "failed" | "skipped", refundId?, error? }.
const refundPaidOrder = async (orderId, { reason = "cancelled", now = Date.now() } = {}) => {
  let order;

  try {
    order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        paymentMethod: "razorpay",
        paymentStatus: "paid",
        orderStatus: "cancelled",
        paymentId: { $ne: "" },
        $or: [
          { refundStatus: { $ne: "processing" } },
          { updatedAt: { $lt: new Date(now - STALE_PROCESSING_MS) } },
        ],
      },
      { $set: { refundStatus: "processing", refundError: "" } },
      { returnDocument: "after" }
    );
  } catch (error) {
    paymentLog.error("refund_claim_error", { orderId: String(orderId), error: describeError(error) });
    return { status: "failed", error: describeError(error) };
  }

  if (!order) return { status: "skipped" };

  const base = {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    razorpayOrderId: order.razorpayOrderId,
    paymentId: order.paymentId,
    amountPaise: Math.round(order.totalAmount * 100),
    reason,
  };

  let refundId = "";

  try {
    const refund = await getRazorpay().payments.refund(order.paymentId, {
      amount: Math.round(order.totalAmount * 100),
      speed: "normal",
      receipt: order.orderNumber,
      notes: { orderNumber: order.orderNumber, reason },
    });
    refundId = refund?.id || "";
  } catch (error) {
    if (!isAlreadyRefunded(error)) {
      const message = describeError(error);

      try {
        await Order.updateOne(
          { _id: order._id },
          { $set: { refundStatus: "failed", refundError: message } }
        );
      } catch (persistError) {
        paymentLog.error("refund_state_save_failed", { ...base, error: describeError(persistError) });
      }

      paymentLog.error("refund_failed", { ...base, error: message });
      return { status: "failed", error: message };
    }

    paymentLog.warn("refund_already_done", base);
  }

  try {
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          paymentStatus: "refunded",
          refundStatus: "succeeded",
          refundId,
          refundError: "",
          refundedAt: new Date(now),
        },
      }
    );
  } catch (persistError) {
    // Money has been refunded but we could not record it. The sweeper retries
    // (and Razorpay answers "already refunded"), which then records it.
    paymentLog.error("refund_state_save_failed", { ...base, refundId, error: describeError(persistError) });
    return { status: "failed", error: describeError(persistError) };
  }

  paymentLog.info("refund_succeeded", { ...base, refundId });
  return { status: "refunded", refundId };
};

// Used by the sweeper: retries refunds that failed or got stuck.
const retryPendingRefunds = async ({ now = Date.now(), limit = 20 } = {}) => {
  const candidates = await Order.find({
    paymentMethod: "razorpay",
    paymentStatus: "paid",
    orderStatus: "cancelled",
    $or: [
      { refundStatus: "failed" },
      {
        refundStatus: "processing",
        updatedAt: { $lt: new Date(now - STALE_PROCESSING_MS) },
      },
    ],
  })
    .limit(limit)
    .select("_id");

  const results = [];

  for (const { _id } of candidates) {
    results.push(await refundPaidOrder(_id, { reason: "retry", now }));
  }

  return results;
};

module.exports = { refundPaidOrder, retryPendingRefunds, STALE_PROCESSING_MS };
