# Dhaaga Backend

Merged backend for the Dhaaga clothing e-commerce website.

## Stack
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication in HTTP-only cookies
- bcrypt password hashing

## Included
- Authentication and current-user session
- Customer/admin authorization
- Products and categories
- Product variants and stock
- Cart and wishlist
- Saved addresses
- Orders and order status lifecycle
- Inventory reservation/restoration helpers
- Product reviews with verified-purchase checks
- Admin users, orders and dashboard APIs
- Request validation and centralized error handling
- Rate limiting for sensitive auth endpoints
- Pagination, search and product sorting
- Environment validation (production also requires the Razorpay keys)
- Razorpay online payments: server-priced orders, signature-verified checkout, webhook, abandoned-order stock release
- Rate limiting on order creation

## Intentionally postponed
- Cloudinary/S3 image uploads
- Email verification
- Password reset
- Coupons/discount engine

## Setup

```bash
npm install
```

Create `.env` from `.env.example` and fill in your own values.

```bash
npm run dev
```

API: `http://localhost:5000`

## Razorpay (test mode)

1. Razorpay Dashboard > Test Mode > API Keys: put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (a matching pair) in `backend/.env`. Only the key id is ever sent to the browser.
2. Webhook (needed so paid orders finalise even if the shopper closes the tab): Dashboard > Webhooks > add `https://<your-api>/api/orders/razorpay/webhook`, enable `payment.captured`, set a secret and put it in `RAZORPAY_WEBHOOK_SECRET`. For local testing expose the API with a tunnel (e.g. ngrok).
3. Test card/UPI details: see Razorpay's test-mode docs.

How it works:

- `POST /api/orders` with `paymentMethod: "razorpay"` prices the cart on the server from database prices (client totals are ignored), reserves stock, creates the Razorpay order and returns `{ order, razorpay: { orderId, amount, currency, keyId } }`. The cart is kept until payment is verified.
- `POST /api/orders/razorpay/verify` checks the HMAC-SHA256 signature (`order_id|payment_id`) with a timing-safe compare, then marks the order paid. A bad signature changes nothing. Repeating a verify is harmless.
- `POST /api/orders/razorpay/webhook` (raw body, `X-Razorpay-Signature`) handles `payment.captured`. It ignores events whose amount differs from the order total. `payment.failed` is acknowledged only, because a shopper can retry inside the same Razorpay window.
- Stock for unpaid Razorpay orders is released when the same shopper starts a new checkout, and by a sweeper after 30 minutes. If a payment arrives after its order was released, the stock is reserved again; if that is impossible the order stays cancelled, is marked paid and `REFUND REQUIRED` is logged (refunds are not automated).

## Important

Never commit `.env` or expose MongoDB/JWT secrets.

A full endpoint/integration test pass should be done after the backend merge is complete.
