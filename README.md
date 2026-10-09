# Dhaaga-E-Jashn

Online store for Indian kurtas and kurtis. Next.js (App Router, TypeScript) storefront, an Express + MongoDB API, and an admin dashboard.

```
app/            Next.js routes
  admin/        Admin dashboard (own layout, sidebar, auth guard)
components/
  layout/       Navbar, Footer
  home/         Homepage sections
  shop/         ProductCard, ProductGrid, QuickViewModal
  auth/         GoogleLoginButton
  ui/           Toast, BagCountManager
  admin/        Admin UI kit (tables, modals, badges…)
context/        AuthContext (session, cart + wishlist counts)
lib/
  api/          One module per API area (auth, cart, products, admin…), shared fetch client
  hooks/        useFetch, useDebounced
  content.ts    Static homepage content
  format.ts     formatPrice / formatDate
backend/        Express 5 + Mongoose API (see backend/README.md)
```

## Run it locally

```bash
# 1. API
cd backend
cp .env.example .env          # fill in MONGODB_URI and JWT_SECRET
npm install
npm run seed                  # sample categories + products (optional)
npm run create-admin -- you@example.com 'a-strong-password' 'Your Name'
npm run dev                   # http://localhost:5000

# 2. Storefront + admin (new terminal, repo root)
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

Sign in at `/login` with the admin account, then open **`/admin`**.

## Admin dashboard

| Page | What it does |
| --- | --- |
| Overview | Revenue, orders, 14-day sales chart, order pipeline, best sellers, low-stock alerts, recent orders |
| Orders | Search/filter, order detail, move through confirmed → processing → shipped → delivered, or cancel (restocks inventory) |
| Products | Create/edit with variants and stock, hide/show, search, paging |
| Categories | Create/edit, product counts, activate/deactivate |
| Reviews | Show/hide or delete customer reviews |
| Customers | Search users, grant or remove admin access |

Access is enforced by the API (every `/api/admin/*` route requires an admin session); the frontend guard only decides what to show.

## Tests

```bash
cd backend
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/dhaaga_test npm test
```

The suite wipes its database, so the name must contain `test`. Frontend checks: `npx tsc --noEmit` and `npm run build`.

## Deploying with separate domains

If the site and the API are on different domains (for example Vercel + Render), set `COOKIE_SAMESITE=none` and `CLIENT_URL=https://your-site` on the API, and `NEXT_PUBLIC_API_URL=https://your-api/api` on the frontend. Otherwise the login cookie will not be sent.
