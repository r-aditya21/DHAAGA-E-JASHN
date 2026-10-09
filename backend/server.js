const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoose = require("mongoose");
require("dotenv").config();

const { validateEnv, getAllowedOrigins } = require("./config/env");
validateEnv();

const connectDB = require("./config/db");
const { ensureBody } = require("./middleware/validate.middleware");
const { notFound, errorHandler } = require("./middleware/error.middleware");
const { apiLimiter } = require("./middleware/rateLimit.middleware");
const { razorpayWebhook } = require("./controllers/razorpayWebhook.controller");
const { releaseExpiredRazorpayOrders } = require("./services/order.service");

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const cartRoutes = require("./routes/cart.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const addressRoutes = require("./routes/address.routes");
const orderRoutes = require("./routes/order.routes");
const userRoutes = require("./routes/user.routes");
const reviewRoutes = require("./routes/review.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

app.disable("x-powered-by");

// Secure default headers. The API only returns JSON, and the frontend is a
// different origin, so cross-origin resource policy must allow it.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Needed so req.ip is correct behind a hosting proxy (Render, Railway, etc.)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header) and listed origins.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })
);

// Razorpay webhook: needs the RAW body for signature verification, so it must
// be registered before express.json(). Server-to-server: no CORS/auth/limiter.
app.post(
  "/api/orders/razorpay/webhook",
  express.raw({ type: "application/json", limit: "100kb" }),
  razorpayWebhook
);

app.use(express.json({ limit: "100kb" }));
app.use(ensureBody);
app.use(cookieParser());

app.use("/api", apiLimiter);

// Public storefront config, so the frontend never hard-codes shipping rules.
app.get("/api/config", (req, res) => {
  const { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } = require("./config/constants");
  res.json({
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    shippingFee: SHIPPING_FEE,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Dhaaga API is running",
  });
});

// For uptime monitors / hosting health checks. 503 while the DB is down.
app.get("/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "degraded",
    database: dbConnected ? "connected" : "disconnected",
    uptime: Math.round(process.uptime()),
  });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Dhaaga backend running on http://localhost:${PORT}`);
  });

  // Give back stock held by Razorpay checkouts that were never paid.
  const sweep = () =>
    releaseExpiredRazorpayOrders().catch((error) =>
      console.error("Unpaid order sweep failed:", error)
    );
  setInterval(sweep, 5 * 60 * 1000).unref();

  // Finish in-flight requests and close the DB cleanly on deploy/restart.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);

    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
