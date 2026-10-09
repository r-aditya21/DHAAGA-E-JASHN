const express = require("express");

const {
  getAllUsers,
  getUserById,
  updateUserRole,
} = require("../controllers/user.controller");

const { protect } = require("../middleware/auth.middleware");
const { admin } = require("../middleware/admin.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

const router = express.Router();

router.get(
  "/",
  protect,
  admin,
  getAllUsers
);

router.get(
  "/:id",
  protect,
  admin,
  validateObjectId("id"),
  getUserById
);

router.put(
  "/:id/role",
  protect,
  admin,
  validateObjectId("id"),
  updateUserRole
);

module.exports = router;