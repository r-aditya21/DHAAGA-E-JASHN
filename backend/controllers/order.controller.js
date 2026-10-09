const crypto = require("crypto");
const { getRazorpay } = require("../config/razorpay");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const {
  calculateShipping,
  ORDER_STATUSES,
  canTransitionOrder,
} = require("../config/constants");
const { reserveStock, restoreStock } = require("../services/inventory.service");
const { refundPaidOrder } = require("../services/refund.service");
const { paymentLog, describeError } = require("../utils/logger");
const {
  clearCart,
  markOrderPaid,
  releaseUserUnpaidRazorpayOrders,
} = require("../services/order.service");
const {
  isValidObjectId,
  escapeRegex,
  parsePagination,
  buildPagination,
} = require("../utils/helpers");

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `DHAAGA-${timestamp}-${random}`;
};

const createOrder = async (req, res, next) => {
  try {
    const { addressId, paymentMethod } = req.body;

    if (!addressId || !paymentMethod) {
      return res.status(400).json({
        message: "Address and payment method are required",
      });
    }

    if (!isValidObjectId(addressId)) {
      return res.status(400).json({
        message: "Invalid address ID",
      });
    }

    if (!["cod", "razorpay"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    const cart = await Cart.findOne({
      user: req.user.userId,
    }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      user: req.user.userId,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    // A new online-payment attempt supersedes this shopper's abandoned ones,
    // otherwise their stale reservations would double-hold the same stock.
    if (paymentMethod === "razorpay") {
      await releaseUserUnpaidRazorpayOrders(req.user.userId);
    }

    // Build order lines from current database data (never from the client).
    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isActive) {
        return res.status(400).json({
          message: "An item in your cart is no longer available",
        });
      }

      const variant = product.variants.find(
        (v) => v.size === item.size && v.color === item.color
      );

      if (!variant) {
        return res.status(400).json({
          message: `Variant unavailable for ${product.name}`,
        });
      }

      if (variant.stock < item.quantity) {
        return res.status(409).json({
          message: `Insufficient stock for ${product.name}`,
        });
      }

      subtotal += product.price * item.quantity;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.images?.[0] || "",
        size: item.size,
        color: item.color,
        price: product.price,
        quantity: item.quantity,
      });
    }

    const shippingFee = calculateShipping(subtotal);
    const totalAmount = subtotal + shippingFee;

    // Atomically deduct stock. Prevents two buyers taking the last item.
    const reservation = await reserveStock(orderItems);

    if (!reservation.ok) {
      return res.status(409).json({
        message: `Insufficient stock for ${reservation.failedLine.productName}`,
      });
    }

    let order;

    try {
      order = await Order.create({
        user: req.user.userId,
        items: orderItems,
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: address.country,
        },
        subtotal,
        shippingFee,
        totalAmount,
        paymentMethod,
        orderNumber: generateOrderNumber(),
      });

      if (paymentMethod === "cod") {
        await clearCart(req.user.userId);

        return res.status(201).json({
          message: "Order created successfully",
          order,
        });
      }

      // Razorpay: amount is always the server-computed total, in paise.
      let razorpayOrder;

      try {
        razorpayOrder = await getRazorpay().orders.create({
          amount: Math.round(totalAmount * 100),
          currency: "INR",
          receipt: order.orderNumber,
          notes: {
            dhaagaOrderId: order._id.toString(),
            userId: req.user.userId.toString(),
          },
        });
      } catch (error) {
        paymentLog.error("razorpay_order_create_failed", {
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          statusCode: error.statusCode,
          error: describeError(error),
        });

        if (error.statusCode === 401) {
          const configurationError = new Error(
            "Razorpay rejected the backend credentials. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are a matching pair from the same Test or Live account."
          );
          configurationError.code = "RAZORPAY_AUTHENTICATION_FAILED";
          throw configurationError;
        }

        throw error;
      }

      order.razorpayOrderId = razorpayOrder.id;
      await order.save();

      paymentLog.info("razorpay_order_created", {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        razorpayOrderId: razorpayOrder.id,
        amountPaise: razorpayOrder.amount,
      });

      // Cart is cleared only after the payment is verified.
      return res.status(201).json({
        message: "Payment order created successfully",
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
        },
        razorpay: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: process.env.RAZORPAY_KEY_ID, // public key only
        },
      });
    } catch (error) {
      // Setup failed after stock was reserved: give it back and drop the order.
      await restoreStock(orderItems);

      if (order?._id) {
        await Order.deleteOne({ _id: order._id });
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
};

const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message: "Razorpay payment details are required",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      const error = new Error("Razorpay is not configured");
      error.statusCode = 503;
      throw error;
    }

    const order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user.userId,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "paid") {
      return res.status(200).json({
        message: "Payment already verified",
        order,
      });
    }

    const expected = Buffer.from(
      crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex"),
      "utf8"
    );
    const provided = Buffer.from(razorpay_signature, "utf8");

    const isValid =
      expected.length === provided.length &&
      crypto.timingSafeEqual(expected, provided);

    // A bad signature must NOT mutate the order: it could be a tampered
    // request, and the real payment may still arrive (or hit the webhook).
    if (!isValid) {
      paymentLog.warn("verify_signature_invalid", {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        razorpayOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const paidOrder = await markOrderPaid(order._id, razorpay_payment_id);

    paymentLog.info("verify_succeeded", {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      alreadyFinalised: !paidOrder,
    });
    await clearCart(req.user.userId);

    res.status(200).json({
      message: "Payment verified successfully",
      order: paidOrder || (await Order.findById(order._id)),
    });
  } catch (error) {
    next(error);
  }
};

// ?page=&limit=  (newest first; capped so history can never grow unbounded)
const getMyOrders = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query, {
      defaultLimit: 50,
      maxLimit: 100,
    });

    const filter = { user: req.user.userId };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      orders,
      pagination: buildPagination(pagination, total),
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.status(200).json({
      order,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: ?page=&limit=&status=&paymentStatus=&q=<order number>
const getAllOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, q } = req.query;
    const pagination = parsePagination(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const filter = {};

    if (typeof q === "string" && q.trim()) {
      filter.orderNumber = {
        $regex: escapeRegex(q.trim()),
        $options: "i",
      };
    }

    if (typeof status === "string" && ORDER_STATUSES.includes(status)) {
      filter.orderStatus = status;
    }

    if (
      typeof paymentStatus === "string" &&
      ["pending", "paid", "failed", "refunded"].includes(paymentStatus)
    ) {
      filter.paymentStatus = paymentStatus;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      orders,
      pagination: buildPagination(pagination, total),
    });
  } catch (error) {
    next(error);
  }
};

const getAdminOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email"
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.status(200).json({
      order,
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;

    if (!ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (!canTransitionOrder(order.orderStatus, orderStatus)) {
      return res.status(400).json({
        message: `Cannot change order from "${order.orderStatus}" to "${orderStatus}"`,
      });
    }

    const update = { orderStatus };

    // Cash on delivery is collected when the order is delivered.
    if (
      orderStatus === "delivered" &&
      order.paymentMethod === "cod" &&
      order.paymentStatus === "pending"
    ) {
      update.paymentStatus = "paid";
    }

    // Compare-and-set so two simultaneous requests cannot both apply
    // (important for cancellation, which returns stock).
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, orderStatus: order.orderStatus },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!updatedOrder) {
      return res.status(409).json({
        message: "Order was modified by someone else, please retry",
      });
    }

    if (orderStatus === "cancelled") {
      await restoreStock(order.items);
    }

    // Cancelling a PAID online order must give the customer their money back.
    // A failed refund does not undo the cancellation: it is recorded on the
    // order (refundStatus "failed") and can be retried by the admin or the sweeper.
    let refund = null;

    if (
      orderStatus === "cancelled" &&
      updatedOrder.paymentMethod === "razorpay" &&
      updatedOrder.paymentStatus === "paid"
    ) {
      refund = await refundPaidOrder(updatedOrder._id, { reason: "admin_cancel" });
    }

    const finalOrder = refund ? await Order.findById(order._id) : updatedOrder;

    res.status(200).json({
      message:
        refund?.status === "failed"
          ? "Order cancelled, but the refund failed. Retry the refund from the order."
          : "Order status updated successfully",
      order: finalOrder,
      ...(refund ? { refund } : {}),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/admin/:id/refund  (retry a refund that failed)
const retryOrderRefund = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "refunded") {
      return res.status(200).json({
        message: "Order is already refunded",
        order,
        refund: { status: "refunded", refundId: order.refundId },
      });
    }

    if (
      order.paymentMethod !== "razorpay" ||
      order.paymentStatus !== "paid" ||
      order.orderStatus !== "cancelled"
    ) {
      return res.status(400).json({
        message: "Only paid, cancelled online orders can be refunded",
      });
    }

    const refund = await refundPaidOrder(order._id, { reason: "admin_retry" });

    if (refund.status === "skipped") {
      return res.status(409).json({
        message: "A refund for this order is already in progress",
      });
    }

    res.status(refund.status === "failed" ? 502 : 200).json({
      message:
        refund.status === "failed"
          ? "Refund failed. It is saved on the order and will be retried."
          : "Refund issued",
      order: await Order.findById(order._id),
      refund,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  retryOrderRefund,
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  verifyRazorpayPayment,
};
