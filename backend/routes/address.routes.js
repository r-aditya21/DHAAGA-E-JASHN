const express = require("express");

const {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/address.controller");

const { protect } = require("../middleware/auth.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

const router = express.Router();

router.get("/", protect, getAddresses);

router.post("/", protect, createAddress);

router.put("/:id", protect, validateObjectId("id"), updateAddress);

router.delete("/:id", protect, validateObjectId("id"), deleteAddress);

module.exports = router;