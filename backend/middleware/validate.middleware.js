const { isValidObjectId } = require("../utils/helpers");

// Usage: router.get("/:id", validateObjectId("id"), handler)
const validateObjectId =
  (...params) =>
  (req, res, next) => {
    for (const param of params) {
      if (!isValidObjectId(req.params[param])) {
        return res.status(400).json({
          message: `Invalid ${param}`,
        });
      }
    }

    next();
  };

// Express 5 leaves req.body undefined when no body is sent.
const ensureBody = (req, res, next) => {
  if (!req.body || typeof req.body !== "object") {
    req.body = {};
  }

  next();
};

module.exports = { validateObjectId, ensureBody };
