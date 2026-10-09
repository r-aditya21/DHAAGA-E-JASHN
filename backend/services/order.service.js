const Order = require("../models/Order");
const Cart = require("../models/Cart");
const { reserveStock, restoreStock } = require("./inventory.service");
const { refundPaidOrder, retryPendingRefunds } = require("./refund.service");
const { paymentLog } = require("../utils/logger");

// Razorpay orders that were started but never paid hold reserved stock.
// After this long they are released by the sweeper.
const UNPAID_RAZORPAY_TTL_MS = 30 * 60 * 1000;

const clearCart = (userId) =>
  Cart.updateOne({ user: userId }, { $set: { items: [] } });

// Idempotent: only the first caller flips an order to paid.
// Returns the updated order, or null if it was already paid.
// If WE released the order (cancelled, paymentStatus "failed") before the money
// arrived, the stock is re-reserved; if that is no longer possible, or an admin
// cancelled it, the order stays cancelled, is recorded as paid, and the money
// is refunded automatically (a failed refund is kept on the order and retried).
const markOrderPaid = async (orderId, paymentId) => {
  const current = await Order.findById(orderId);

  if (!current || current.paymentStatus === "paid") return null;

  let orderStatus = "confirmed";

  let reservedAgain = false;

  if (current.orderStatus === "cancelled") {
    const releasedByUs = current.paymentStatus === "failed";
    const reservation = releasedByUs
      ? await reserveStock(current.items)
      : { ok: false };

    if (reservation.ok) {
      reservedAgain = true;
    } else {
      orderStatus = "cancelled";
      paymentLog.warn("paid_order_unfulfillable", {
        orderId: String(current._id),
        orderNumber: current.orderNumber,
        razorpayOrderId: current.razorpayOrderId,
        paymentId,
        releasedByUs,
      });
    }
  }

  const paid = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: "paid" } },
    { $set: { paymentStatus: "paid", paymentId, orderStatus } },
    { returnDocument: "after" }
  );

  // Lost a race with another finalizer: undo our extra reservation.
  if (!paid && reservedAgain) {
    await restoreStock(current.items);
  }

  if (paid) {
    paymentLog.info("order_marked_paid", {
      orderId: String(paid._id),
      orderNumber: paid.orderNumber,
      razorpayOrderId: paid.razorpayOrderId,
      paymentId,
      orderStatus: paid.orderStatus,
      reservedAgain,
    });

    // Paid but cancelled and cannot be fulfilled: give the money back now.
    // refundPaidOrder never throws and records failures for the sweeper.
    if (paid.orderStatus === "cancelled") {
      await refundPaidOrder(paid._id, { reason: "unfulfillable_payment" });
    }
  }

  return paid;
};

// Cancel one unpaid Razorpay order and give its stock back. Compare-and-set,
// so the stock is returned at most once and never for a paid order.
const releaseUnpaidRazorpayOrder = async (filter) => {
  const order = await Order.findOneAndUpdate(
    {
      ...filter,
      paymentMethod: "razorpay",
      paymentStatus: { $in: ["pending", "failed"] },
      orderStatus: "pending",
    },
    { $set: { orderStatus: "cancelled", paymentStatus: "failed" } },
    { returnDocument: "before" }
  );

  if (!order) return false;

  await restoreStock(order.items);
  paymentLog.info("unpaid_order_released", {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    razorpayOrderId: order.razorpayOrderId,
  });
  return true;
};

// A shopper starting a new checkout supersedes their own abandoned attempts.
const releaseUserUnpaidRazorpayOrders = async (userId) => {
  const stale = await Order.find({
    user: userId,
    paymentMethod: "razorpay",
    paymentStatus: "pending",
    orderStatus: "pending",
  }).select("_id");

  let released = 0;

  for (const { _id } of stale) {
    if (await releaseUnpaidRazorpayOrder({ _id })) released += 1;
  }

  return released;
};

const releaseExpiredRazorpayOrders = async (now = Date.now()) => {
  const expired = await Order.find({
    paymentMethod: "razorpay",
    paymentStatus: "pending",
    orderStatus: "pending",
    createdAt: { $lt: new Date(now - UNPAID_RAZORPAY_TTL_MS) },
  }).select("_id");

  let released = 0;

  for (const { _id } of expired) {
    if (await releaseUnpaidRazorpayOrder({ _id })) released += 1;
  }

  return released;
};

// One sweeper tick: release abandoned checkouts, then retry failed refunds.
// Each part is isolated and logged so one failure never hides the other.
const runSweep = async () => {
  const summary = { released: 0, refundsRetried: 0 };

  try {
    summary.released = await releaseExpiredRazorpayOrders();
  } catch (error) {
    paymentLog.error("sweep_release_failed", { error: error?.message });
  }

  try {
    summary.refundsRetried = (await retryPendingRefunds()).length;
  } catch (error) {
    paymentLog.error("sweep_refund_retry_failed", { error: error?.message });
  }

  if (summary.released || summary.refundsRetried) {
    paymentLog.info("sweep_completed", summary);
  }

  return summary;
};

module.exports = {
  runSweep,
  UNPAID_RAZORPAY_TTL_MS,
  clearCart,
  markOrderPaid,
  releaseUnpaidRazorpayOrder,
  releaseUserUnpaidRazorpayOrders,
  releaseExpiredRazorpayOrders,
};
