const crypto = require("crypto");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  ORDER_STATUSES,
  canTransitionOrder,
} = require("../config/constants");
const { reserveStock, restoreStock } = require("../services/inventory.service");
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

    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
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
    } catch (error) {
      await restoreStock(orderItems);
      throw error;
    }

    // Order placed: empty the cart.
    await Cart.updateOne({ _id: cart._id }, { $set: { items: [] } });

    res.status(201).json({
      message: "Order created successfully",
      order,
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

    res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
};
