const express = require("express");

const {
  createCategory,
  getCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");

const { protect } = require("../middleware/auth.middleware");
const { admin } = require("../middleware/admin.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

const router = express.Router();

// Public
router.get("/", getCategories);
router.get("/:slug", getCategoryBySlug);

// Admin
router.post("/", protect, admin, createCategory);

router.put(
  "/admin/:id",
  protect,
  admin,
  validateObjectId("id"),
  updateCategory
);

router.delete(
  "/admin/:id",
  protect,
  admin,
  validateObjectId("id"),
  deleteCategory
);

module.exports = router;