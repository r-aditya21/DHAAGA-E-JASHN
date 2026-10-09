const express = require("express");

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} = require("../controllers/wishlist.controller");

const { protect } = require("../middleware/auth.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

const router = express.Router();

router.get("/", protect, getWishlist);

router.post("/items", protect, addToWishlist);

router.delete(
  "/items/:productId",
  protect,
  validateObjectId("productId"),
  removeFromWishlist
);

router.delete("/", protect, clearWishlist);

module.exports = router;