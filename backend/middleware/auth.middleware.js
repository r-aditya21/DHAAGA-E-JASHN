const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the JWT cookie, then loads the user from the database so that
// role changes and deleted accounts take effect immediately instead of
// waiting for the token to expire.
const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
    } catch (error) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    const user = await User.findById(decoded.userId).select(
      "_id name email role"
    );

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    // Shape kept compatible with existing controllers (req.user.userId).
    req.user = {
      userId: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protect,
};
