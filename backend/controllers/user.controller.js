const User = require("../models/User");
const Order = require("../models/Order");
const {
  escapeRegex,
  parsePagination,
  buildPagination,
} = require("../utils/helpers");

// Admin: ?page=&limit=&q=<name or email>&role=customer|admin
const getAllUsers = async (req, res, next) => {
  try {
    const { q, role } = req.query;
    const pagination = parsePagination(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const filter = {};

    if (typeof q === "string" && q.trim()) {
      const pattern = { $regex: escapeRegex(q.trim()), $options: "i" };
      filter.$or = [{ name: pattern }, { email: pattern }];
    }

    if (role === "customer" || role === "admin") {
      filter.role = role;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      users,
      pagination: buildPagination(pagination, total),
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const orderCount = await Order.countDocuments({ user: user._id });

    res.status(200).json({ user, orderCount });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!["customer", "admin"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      user._id.toString() === req.user.userId.toString() &&
      role !== "admin"
    ) {
      return res.status(400).json({
        message: "You cannot remove your own admin role",
      });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      message: "User role updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
};
