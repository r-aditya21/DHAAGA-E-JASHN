const notFound = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// Central error handler. Controllers call next(error).
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body too large" });
  }

  if (err.name === "ValidationError") {
    const first = Object.values(err.errors || {})[0];

    return res.status(400).json({
      message: first ? first.message : "Validation failed",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: "Resource already exists" });
  }

  if (err.code === "RAZORPAY_AUTHENTICATION_FAILED") {
    console.error("Razorpay rejected the configured API credentials.");
    return res.status(502).json({ message: err.message });
  }

  const status = err.statusCode || err.status || 500;

  if (status >= 500) {
    console.error("Unhandled error:", err);
  }

  res.status(status).json({
    message: status >= 500 ? "Something went wrong" : err.message,
  });
};

module.exports = { notFound, errorHandler };
