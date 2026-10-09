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
- Environment validation

## Intentionally postponed
- Razorpay integration
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

## Important

Never commit `.env` or expose MongoDB/JWT secrets.

A full endpoint/integration test pass should be done after the backend merge is complete.
