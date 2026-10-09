const express = require("express");

const {
  registerUser,
  loginUser,
  googleLogin,
  getCurrentUser,
  logoutUser,
} = require("../controllers/auth.controller");

const { protect } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/google", authLimiter, googleLogin);
router.get("/me", protect, getCurrentUser);
router.post("/logout", logoutUser);

module.exports = router;