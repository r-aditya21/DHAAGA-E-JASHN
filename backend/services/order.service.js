const Order = require("../models/Order");
const Cart = require("../models/Cart");
const { reserveStock, restoreStock } = require("./inventory.service");

// Razorpay orders that were started but never paid hold reserved stock.
// After this long they are released by the sweeper.
const UNPAID_RAZORPAY_TTL_MS = 30 * 60 * 1000;

const clearCart = (userId) =>
  Cart.updateOne({ user: userId }, { $set: { items: [] } });

// Idempotent: only the first caller flips an order to paid.
// Returns the updated order, or null if it was already paid.
// If WE released the order (cancelled, paymentStatus "failed") before the money
// arrived, the stock is re-reserved; if that is no longer possible, or an admin
// cancelled it, the order stays cancelled but is recorded as paid so it can be
// refunded manually.
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
      console.error(
        `[payments] Order ${current.orderNumber} was paid (${paymentId}) but is cancelled and cannot be fulfilled. REFUND REQUIRED.`
      );
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

module.exports = {
  UNPAID_RAZORPAY_TTL_MS,
  clearCart,
  markOrderPaid,
  releaseUnpaidRazorpayOrder,
  releaseUserUnpaidRazorpayOrders,
  releaseExpiredRazorpayOrders,
};
