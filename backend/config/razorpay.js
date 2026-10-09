const Razorpay = require("razorpay");

let client = null;

// Lazy so the server (and COD-only dev/tests) can boot without Razorpay keys.
// Throws only when a Razorpay payment is actually attempted.
const getRazorpay = () => {
  if (client) return client;

  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    const error = new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
    error.statusCode = 503;
    throw error;
  }

  client = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  return client;
};

module.exports = { getRazorpay };
