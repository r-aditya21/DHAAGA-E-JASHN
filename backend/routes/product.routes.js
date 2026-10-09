const express = require("express");

const {
  createProduct,
  getProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.controller");

const { protect } = require("../middleware/auth.middleware");
const { admin } = require("../middleware/admin.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

const router = express.Router();

// Public
router.get("/", getProducts);
router.get("/:slug", getProductBySlug);

// Admin only
router.post("/", protect, admin, createProduct);
router.put("/:id", protect, admin, validateObjectId("id"), updateProduct);
router.delete("/:id", protect, admin, validateObjectId("id"), deleteProduct);

module.exports = router;