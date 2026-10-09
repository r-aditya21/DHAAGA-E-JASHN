// Fail fast at startup if required configuration is missing.

const REQUIRED = ["MONGODB_URI", "JWT_SECRET", "CLIENT_URL"];
const PRODUCTION_REQUIRED = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
];

const validateEnv = () => {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }

  // Online payments cannot work (or be trusted) without these in production.
  if (process.env.NODE_ENV === "production") {
    const missingPayments = PRODUCTION_REQUIRED.filter(
      (key) => !process.env[key]
    );

    if (missingPayments.length > 0) {
      console.error(
        `Missing required production environment variables: ${missingPayments.join(", ")}`
      );
      process.exit(1);
    }
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn(
      "Warning: GOOGLE_CLIENT_ID is not set, so Google sign-in will fail. " +
        "It must equal NEXT_PUBLIC_GOOGLE_CLIENT_ID on the storefront."
    );
  }

  if (process.env.JWT_SECRET.length < 32) {
    const message =
      "JWT_SECRET should be at least 32 characters long (use a random string).";

    if (process.env.NODE_ENV === "production") {
      console.error(message);
      process.exit(1);
    }

    console.warn(`Warning: ${message}`);
  }
};

// CLIENT_URL may hold several comma-separated origins.
const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const localDevelopmentOrigins =
    process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3000", "http://127.0.0.1:3000"];

  return [...new Set([...configuredOrigins, ...localDevelopmentOrigins])];
};

module.exports = { validateEnv, getAllowedOrigins };
