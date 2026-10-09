<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Payments

Razorpay flow: server prices the order and returns the public key id, checkout.js is loaded on demand in `app/checkout/page.tsx`, then `POST /orders/razorpay/verify` (signature check) and the raw-body webhook finalise it. Never trust client totals or put the key secret in the frontend.
