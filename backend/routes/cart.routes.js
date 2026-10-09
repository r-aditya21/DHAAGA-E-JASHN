const express = require("express");

const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cart.controller");

const { protect } = require("../middleware/auth.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

const router = express.Router();

// All cart routes require authentication

router.get("/", protect, getCart);

router.post("/items", protect, addToCart);

router.put("/items/:itemId", protect, validateObjectId("itemId"), updateCartItem);

router.delete("/items/:itemId", protect, validateObjectId("itemId"), removeCartItem);

router.delete("/", protect, clearCart);

module.exports = router;