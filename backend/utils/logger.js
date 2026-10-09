// Structured (one JSON object per line) logging for payment events.
//
// Safe by construction: only primitive values are kept, values are truncated,
// and any field whose name looks sensitive is dropped, so a careless caller
// cannot leak a secret, signature, token or card detail into the logs.

const SENSITIVE_KEY = /secret|signature|token|password|authorization|cookie|card|cvv|pan\b|key(?!_?id)/i;
const MAX_VALUE_LENGTH = 300;

const sanitize = (fields = {}) => {
  const clean = {};

  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (value === undefined || value === null) continue;

    if (typeof value === "number" || typeof value === "boolean") {
      clean[key] = value;
    } else if (typeof value === "string") {
      clean[key] = value.slice(0, MAX_VALUE_LENGTH);
    } else {
      clean[key] = String(value).slice(0, MAX_VALUE_LENGTH);
    }
  }

  return clean;
};

// Razorpay SDK errors carry the useful text in error.error.description.
const describeError = (error) =>
  String(error?.error?.description || error?.message || error || "unknown error").slice(
    0,
    MAX_VALUE_LENGTH
  );

const write = (level, event, fields) => {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    scope: "payments",
    event,
    ...sanitize(fields),
  });

  // Looked up at call time so tests can capture output.
  (level === "info" ? console.log : console.error)(line);
};

const paymentLog = {
  info: (event, fields) => write("info", event, fields),
  warn: (event, fields) => write("warn", event, fields),
  error: (event, fields) => write("error", event, fields),
};

module.exports = { paymentLog, describeError, sanitize };
