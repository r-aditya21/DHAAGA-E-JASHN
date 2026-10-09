// Small dependency-free in-memory rate limiter for auth endpoints.
// Per-instance and reset on restart; swap for express-rate-limit + a shared
// store (e.g. Redis) if the API is ever scaled to multiple instances.

const createRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();

    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      res.set("Retry-After", Math.ceil((entry.resetAt - now) / 1000));

      return res.status(429).json({
        message: message || "Too many requests, please try again later",
      });
    }

    next();
  };
};

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
