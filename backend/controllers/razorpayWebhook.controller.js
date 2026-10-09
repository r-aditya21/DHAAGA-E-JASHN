const crypto = require("crypto");
const Order = require("../models/Order");
const { markOrderPaid, clearCart } = require("../services/order.service");
const { paymentLog, describeError } = require("../utils/logger");

const signaturesMatch = (rawBody, signature, secret) => {
  if (typeof signature !== "string" || !signature) return false;

  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex"),
    "utf8"
  );
  const provided = Buffer.from(signature, "utf8");

  return (
    expected.length === provided.length &&
    crypto.timingSafeEqual(expected, provided)
  );
};

// POST /api/orders/razorpay/webhook
// Mounted with express.raw() BEFORE express.json() in server.js: the HMAC must
// be computed over the exact bytes Razorpay sent.
// No auth/CSRF/rate limit (Razorpay is the caller); the signature is the auth.
const razorpayWebhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      return res.status(503).json({ message: "Webhook is not configured" });
    }

    const rawBody = req.body;

    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    if (!signaturesMatch(rawBody, req.get("X-Razorpay-Signature"), secret)) {
      paymentLog.warn("webhook_signature_invalid", { ip: req.ip });
      return res.status(400).json({ message: "Invalid signature" });
    }

    let event;

    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ message: "Invalid payload" });
    }

    // payment.failed is acknowledged but changes nothing: Razorpay fires it
    // per attempt and the shopper can retry inside the same modal. Unpaid
    // orders are released by the expiry sweeper instead.
    if (event.event !== "payment.captured") {
      paymentLog.info("webhook_ignored", {
        eventType: event.event,
        razorpayOrderId: event.payload?.payment?.entity?.order_id,
        paymentId: event.payload?.payment?.entity?.id,
      });
      return res.status(200).json({ received: true });
    }

    const payment = event.payload?.payment?.entity;

    if (!payment?.order_id || !payment?.id) {
      return res.status(200).json({ received: true });
    }

    const order = await Order.findOne({ razorpayOrderId: payment.order_id });

    if (!order) {
      paymentLog.warn("webhook_unknown_order", {
        razorpayOrderId: payment.order_id,
        paymentId: payment.id,
      });
      return res.status(200).json({ received: true });
    }

    // Never trust an event whose amount differs from what we charged.
    if (
      payment.amount !== Math.round(order.totalAmount * 100) ||
      payment.currency !== "INR"
    ) {
      paymentLog.error("webhook_amount_mismatch", {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        razorpayOrderId: payment.order_id,
        paymentId: payment.id,
        expectedPaise: Math.round(order.totalAmount * 100),
        receivedPaise: payment.amount,
        currency: payment.currency,
      });
      return res.status(200).json({ received: true });
    }

    const paid = await markOrderPaid(order._id, payment.id);

    paymentLog.info("webhook_captured_processed", {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      razorpayOrderId: payment.order_id,
      paymentId: payment.id,
      outcome: paid ? "finalised" : "already_finalised",
    });

    if (paid) {
      await clearCart(order.user);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    // Non-2xx makes Razorpay retry, which is what we want for transient errors.
    paymentLog.error("webhook_processing_failed", { error: describeError(error) });
    next(error);
  }
};

module.exports = { razorpayWebhook };
