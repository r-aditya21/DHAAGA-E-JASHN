// Rate limiting via express-rate-limit.
//
// IMPORTANT: the default store is IN MEMORY, i.e. counters are per Node process
// and reset on restart. That is fine for a single instance. If the API runs on
// more than one instance (or behind autoscaling), every instance counts
// separately, so the effective limit is multiplied; pass a shared `store`
// (e.g. rate-limit-redis) to createRateLimiter to enforce one global limit.
// Behind a proxy/load balancer, `trust proxy` must be set (server.js does this
// in production) so the client IP, not the proxy's, is what gets counted.

const rateLimit = require("express-rate-limit");

const createRateLimiter = ({ windowMs, max, message, store }) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7", // RateLimit + Retry-After headers
    legacyHeaders: false,
    ...(store ? { store } : {}),
    message: { message: message || "Too many requests, please try again later" },
  });

const fromEnv = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

// Login / register / Google sign-in: brute-force protection.
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: fromEnv("AUTH_RATE_LIMIT_MAX", 20),
  message: "Too many attempts, please try again in a few minutes",
});

// Everything else under /api: a generous ceiling against scraping/abuse.
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: fromEnv("API_RATE_LIMIT_MAX", 300),
});

// Order creation (also creates Razorpay orders and reserves stock).
const orderLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: fromEnv("ORDER_RATE_LIMIT_MAX", 30),
  message: "Too many order attempts, please try again in a few minutes",
});

module.exports = { createRateLimiter, authLimiter, apiLimiter, orderLimiter };
