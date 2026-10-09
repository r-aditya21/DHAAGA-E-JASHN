const express = require("express");

const {
  getDashboardStats,
  getRecentOrders,
  getAdminProducts,
  getAdminProductById,
  getAdminCategories,
  getAdminReviews,
  setReviewApproval,
  deleteAdminReview,
} = require("../controllers/admin.controller");

const { protect } = require("../middleware/auth.middleware");
const { admin } = require("../middleware/admin.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

const router = express.Router();

// Every admin route requires a logged-in admin.
router.use(protect, admin);

router.get("/dashboard", getDashboardStats);
router.get("/recent-orders", getRecentOrders);

router.get("/products", getAdminProducts);
router.get("/products/:id", validateObjectId("id"), getAdminProductById);
router.get("/categories", getAdminCategories);

router.get("/reviews", getAdminReviews);
router.put("/reviews/:id/approval", validateObjectId("id"), setReviewApproval);
router.delete("/reviews/:id", validateObjectId("id"), deleteAdminReview);

module.exports = router;
