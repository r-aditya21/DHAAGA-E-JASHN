# Dhaaga manual test script (Razorpay TEST keys)

Run this once before going live, and again after any payment change. Tick each box.
Do NOT use live keys. Use a throw-away customer account and an admin account.

## 0. Setup (once)

1. `backend/.env`: `NODE_ENV=development`, `MONGODB_URI`, `JWT_SECRET` (32+ chars), `CLIENT_URL=http://localhost:3000`,
   `GOOGLE_CLIENT_ID`, `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (a matching **Test mode** pair), `RAZORPAY_WEBHOOK_SECRET`.
2. Root `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same value as the API's). Restart `next dev` after changing it (it is baked in at build time).
3. Start API (`cd backend && npm run dev`) and storefront (`npm run dev`).
4. Tunnel: `ngrok http 5000`. In Razorpay Dashboard > Test Mode > Webhooks add
   `https://<ngrok-host>/api/orders/razorpay/webhook`, enable **payment.captured**, secret = `RAZORPAY_WEBHOOK_SECRET`.
5. Have one product with a variant of known stock (e.g. M / Sand, stock 5) and note it. Use `mongosh` to check state:
   ```
   db.orders.find({}, {orderNumber:1,orderStatus:1,paymentStatus:1,paymentId:1,refundStatus:1,refundId:1}).sort({createdAt:-1}).limit(3)
   db.products.findOne({slug:"<slug>"}, {variants:1})
   ```
6. Watch the API terminal. Payment events are JSON lines with `"scope":"payments"`.
7. Razorpay test payments: UPI `success@razorpay` (failure: `failure@razorpay`); cards/netbanking per Razorpay's test-mode docs.

## 1. Cart and checkout agree on shipping

- [ ] Add one item below the free-shipping threshold. Cart page and checkout page show the **same** shipping fee and total.
- [ ] Add items until the subtotal is just below, then at/above the threshold. Shipping flips to FREE at exactly the same point on both pages.
- [ ] `GET http://localhost:5000/api/config` returns the threshold/fee that the shop banner and product page display.
- [ ] Change `FREE_SHIPPING_THRESHOLD` in `backend/.env`, restart API: every page shows the new number without a frontend change.

## 2. Cash on delivery

- [ ] Place a COD order. Order is `pending` / payment `pending`; stock dropped by the quantity; cart is empty.
- [ ] Admin: move it pending > confirmed > processing > shipped > delivered. On delivered, payment becomes `paid`.

## 3. Online payment, success

- [ ] Choose online payment, pay with UPI `success@razorpay`.
- [ ] Order shows paid/confirmed in the UI and in mongosh (`paymentId` starts with `pay_`). Cart is empty. Stock dropped once.
- [ ] Logs show `razorpay_order_created`, `verify_succeeded`, `order_marked_paid`, and (after Razorpay calls the webhook) `webhook_captured_processed` with `outcome: already_finalised`.
- [ ] Reload the success page / re-send the verify request: nothing changes, stock does not drop again.

## 4. Close the payment window, then retry

- [ ] Click Pay, then close the Razorpay window without paying. Order is `pending`/`pending`; stock is held; cart still has the items.
- [ ] Click Pay again and complete the payment. Only **one** order ends up paid; the abandoned attempt is `cancelled` with its stock returned (`unpaid_order_released` log); net stock drop is exactly the quantity.

## 5. Tampered signature

- [ ] Start an online checkout and note `razorpay.orderId` from the create-order response (DevTools > Network).
- [ ] Replay verify with a bad signature (use the real session cookie):
  ```
  curl -i -X POST http://localhost:5000/api/orders/razorpay/verify \
    -H 'Content-Type: application/json' -H 'Cookie: token=<your cookie>' \
    -d '{"razorpay_order_id":"<order id>","razorpay_payment_id":"pay_fake","razorpay_signature":"deadbeef"}'
  ```
  Expect **400** "Invalid payment signature", order still `pending`/unpaid, log `verify_signature_invalid` (the signature itself is not logged).
- [ ] Webhook with a bad signature: `curl -i -X POST https://<ngrok>/api/orders/razorpay/webhook -H 'X-Razorpay-Signature: bad' -d '{}'` returns **400**; log `webhook_signature_invalid`.

## 6. Webhook finalises the order when the tab is closed before verify

- [ ] DevTools > Network > right-click the `razorpay/verify` request pattern > **Block request URL** (or go offline right after paying).
- [ ] Pay with UPI `success@razorpay`, then close the tab immediately.
- [ ] Within about a minute the order is `paid`/`confirmed` in mongosh and the log shows `webhook_captured_processed` with `outcome: finalised`. Stock dropped once. (If it does not, the webhook URL/secret is wrong: check the Razorpay Dashboard webhook delivery log.)
- [ ] Log in again: the cart is cleared.

## 7. Payment after the 30-minute release re-reserves stock

- [ ] Start an online checkout and leave the Razorpay window **open** (do not pay). Note the stock (it is held).
- [ ] In mongosh backdate the order: `db.orders.updateOne({orderNumber:"<n>"},{$set:{createdAt:new Date(Date.now()-31*60*1000)}})`.
- [ ] Wait up to 5 minutes for the sweeper (log `sweep_completed` with `released: 1`). Order is now `cancelled`; stock is back.
- [ ] Complete the payment in the still-open window. Order becomes `paid`/`confirmed` and stock is reserved again (log `order_marked_paid` with `reservedAgain: true`).
- [ ] Repeat, but first set the variant's stock to 0 in mongosh before paying: order stays `cancelled`, log `paid_order_unfulfillable`, then a refund is issued automatically (`refund_succeeded`), `paymentStatus` = `refunded`.

## 8. Admin cancels a paid online order: refund

- [ ] Pay for an online order (section 3). As admin, set it to **cancelled**.
- [ ] Response says cancelled; mongosh: `orderStatus: cancelled`, `paymentStatus: refunded`, `refundStatus: succeeded`, `refundId` starts with `rfnd_`. Stock restored.
- [ ] Razorpay Dashboard > Test Mode > Payments: the payment shows a **full** refund of the order total (including shipping).
- [ ] Cancel again or call `POST /api/orders/admin/<id>/refund`: no second refund appears in Razorpay.
- [ ] Cancel a COD order and an unpaid online order: no refund is attempted.
- [ ] (Failure path, optional) Temporarily set a wrong `RAZORPAY_KEY_SECRET`, restart, cancel a paid online order: the order is cancelled, `paymentStatus` stays `paid`, `refundStatus: failed`, `refundError` set. Restore the right key, restart; within 5 minutes the sweeper (or `POST /api/orders/admin/<id>/refund`) completes the refund.

## 9. Google login

Google Cloud Console > APIs & Services > Credentials > your **Web** OAuth client:
**Authorized JavaScript origins** must list exactly `http://localhost:3000` and `https://<your-production-domain>` (no trailing slash, no path). No redirect URIs are needed for the button flow.

- [ ] localhost: sign in with Google. You are logged in, the navbar updates, and `/api/auth/me` works after a reload.
- [ ] Sign in again with the same Google account: no duplicate user (check `db.users.find({email:"<you>"}).count()` is 1).
- [ ] An existing password account with the same email gets Google linked instead of a duplicate.
- [ ] Deployed domain: repeat on the production URL. If the button shows "The given origin is not allowed", add the origin in the Console (changes can take a few minutes).
- [ ] If sign-in fails, the API log says `Google ID token rejected: <reason>`; "Wrong recipient" means `GOOGLE_CLIENT_ID` (API) differs from `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (storefront build).
- [ ] If frontend and API are on different sites: `COOKIE_SAMESITE=none`, HTTPS on both, and `CLIENT_URL` contains the exact storefront origin.

## 10. Production smoke (after deploy)

- [ ] `NODE_ENV=production`, `CLIENT_URL`, 32+ char `JWT_SECRET`, Razorpay keys and webhook secret are set (the API refuses to start otherwise).
- [ ] Login cookie is `HttpOnly; Secure` (DevTools > Application > Cookies).
- [ ] Razorpay Dashboard webhook points at the production API URL (not the ngrok one) with the production secret.
- [ ] Repeat sections 3, 6 and 8 once with a small real payment before launch, then refund it.
