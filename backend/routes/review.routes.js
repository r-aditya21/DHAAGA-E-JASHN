const express = require("express");

const {
  createReview,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteReview,
} = require("../controllers/review.controller");

const { protect } = require("../middleware/auth.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

const router = express.Router();

// Public
router.get(
  "/product/:productId",
  validateObjectId("productId"),
  getProductReviews
);

// Customer
router.post("/", protect, createReview);

router.get(
  "/my",
  protect,
  getMyReviews
);

router.put(
  "/:id",
  protect,
  validateObjectId("id"),
  updateReview
);

router.delete(
  "/:id",
  protect,
  validateObjectId("id"),
  deleteReview
);

module.exports = router;