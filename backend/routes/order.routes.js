const express = require("express");

const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  verifyRazorpayPayment,
} = require("../controllers/order.controller");

const { protect } = require("../middleware/auth.middleware");
const { admin } = require("../middleware/admin.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

const router = express.Router();

// Customer
router.post("/", protect, createOrder);

router.get("/", protect, getMyOrders);

// Must be registered before any "/:id" route
router.post("/razorpay/verify", protect, verifyRazorpayPayment);

// Admin
router.get("/admin/all", protect, admin, getAllOrders);

router.get(
  "/admin/:id",
  protect,
  admin,
  validateObjectId("id"),
  getAdminOrderById
);

router.put(
  "/admin/:id/status",
  protect,
  admin,
  validateObjectId("id"),
  updateOrderStatus
);

// Customer
router.get("/:id", protect, validateObjectId("id"), getOrderById);

module.exports = router;