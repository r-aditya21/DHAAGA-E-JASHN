// End-to-end API tests. Run with:  npm test
//
// Needs a MongoDB to talk to. Defaults to mongodb://127.0.0.1:27017/dhaaga_test;
// override with MONGODB_URI_TEST. The database is WIPED before and after the
// run, so the name must contain "test" or the suite refuses to start.

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const TEST_URI =
  process.env.MONGODB_URI_TEST || "mongodb://127.0.0.1:27017/dhaaga_test";

const dbName = new URL(TEST_URI).pathname.replace("/", "");

if (!/test/i.test(dbName)) {
  throw new Error(
    `Refusing to run: database "${dbName}" does not look like a test database (name must contain "test").`
  );
}

process.env.MONGODB_URI = TEST_URI;
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-secret-test-secret-test-secret-123";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
process.env.AUTH_RATE_LIMIT_MAX = "1000";
process.env.API_RATE_LIMIT_MAX = "100000";
process.env.ORDER_RATE_LIMIT_MAX = "100000";
process.env.RAZORPAY_WEBHOOK_SECRET = "mock_webhook_secret";

// Razorpay is mocked: no network, no real keys.
process.env.RAZORPAY_KEY_ID = "rzp_test_mock";
process.env.RAZORPAY_KEY_SECRET = "mock_razorpay_secret";

const razorpayMock = {
  calls: [],
  failWith: null,
  counter: 0,
  refunds: [],
  refundFailWith: null,
};
const configPath = require.resolve("../config/razorpay");
require.cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: {
    getRazorpay: () => ({
      payments: {
        refund: async (paymentId, params) => {
          if (razorpayMock.refundFailWith) throw razorpayMock.refundFailWith;
          razorpayMock.refunds.push({ paymentId, params });
          return { id: `rfnd_mock_${razorpayMock.refunds.length}`, payment_id: paymentId };
        },
      },
      orders: {
        create: async (options) => {
          if (razorpayMock.failWith) throw razorpayMock.failWith;
          razorpayMock.calls.push(options);
          razorpayMock.counter += 1;
          return {
            id: `order_mock_${razorpayMock.counter}`,
            amount: options.amount,
            currency: options.currency,
          };
        },
      },
    }),
  },
};

const signPayment = (orderId, paymentId) =>
  crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

const app = require("../server");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { releaseExpiredRazorpayOrders } = require("../services/order.service");

let server;
let baseUrl;

const call = async (method, path, { body, cookie } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    // GET/HEAD cannot carry a body
    body:
      body === undefined || method === "GET" || method === "HEAD"
        ? undefined
        : JSON.stringify(body),
  });

  const setCookie = response.headers.get("set-cookie");

  return {
    status: response.status,
    data: await response.json().catch(() => null),
    cookie: setCookie ? setCookie.split(";")[0] : null,
    rawCookie: setCookie,
  };
};

const PASSWORD = "Password123!";
const ctx = {}; // state shared between the ordered tests below

const registerAndLogin = async (name, email) => {
  const reg = await call("POST", "/api/auth/register", {
    body: { name, email, password: PASSWORD },
  });
  assert.equal(reg.status, 201);

  const login = await call("POST", "/api/auth/login", {
    body: { email, password: PASSWORD },
  });
  assert.equal(login.status, 200);

  return login.cookie;
};

const stockOf = async (productId, size, color) => {
  const product = await Product.findById(productId);
  return product.variants.find((v) => v.size === size && v.color === color)
    .stock;
};

before(async () => {
  await mongoose.connect(TEST_URI);
  await mongoose.connection.dropDatabase();
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init())
  );

  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Admin accounts cannot be self-registered, so create one directly.
  await User.create({
    name: "Test Admin",
    email: "admin@dhaaga.test",
    password: await bcrypt.hash(PASSWORD, 4),
    role: "admin",
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("platform", () => {
  it("serves root and health", async () => {
    assert.equal((await call("GET", "/")).status, 200);

    const health = await call("GET", "/health");
    assert.equal(health.status, 200);
    assert.equal(health.data.database, "connected");
  });

  it("returns JSON 404 for unknown routes and sets security headers", async () => {
    const res = await fetch(`${baseUrl}/api/nope`);
    assert.equal(res.status, 404);
    assert.equal(res.headers.get("x-powered-by"), null);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  });

  it("serves public shipping config from the same constants as pricing", async () => {
    const res = await call("GET", "/api/config");
    assert.equal(res.status, 200);
    assert.equal(res.data.freeShippingThreshold, 1999);
    assert.equal(res.data.shippingFee, 99);
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    assert.equal(res.status, 400);
  });
});

describe("auth", () => {
  it("validates registration input", async () => {
    const cases = [
      [{ name: "A", email: "a@b.co", password: PASSWORD }, "short name"],
      [{ name: "Aarav", email: "nope", password: PASSWORD }, "bad email"],
      [{ name: "Aarav", email: "a@b.co", password: "short" }, "short password"],
      [{ name: "Aarav", email: { $ne: null }, password: PASSWORD }, "operator email"],
    ];

    for (const [body, label] of cases) {
      const res = await call("POST", "/api/auth/register", { body });
      assert.equal(res.status, 400, label);
    }
  });

  it("registers, rejects duplicates, logs in and returns the session", async () => {
    ctx.customerEmail = `aarav_${Date.now()}@example.com`;

    const dupe = await call("POST", "/api/auth/register", {
      body: { name: "Aarav", email: ctx.customerEmail, password: PASSWORD },
    });
    assert.equal(dupe.status, 201);

    const again = await call("POST", "/api/auth/register", {
      body: {
        name: "Aarav",
        email: ctx.customerEmail.toUpperCase(),
        password: PASSWORD,
      },
    });
    assert.equal(again.status, 409, "duplicate email (case-insensitive)");

    const login = await call("POST", "/api/auth/login", {
      body: { email: ctx.customerEmail, password: PASSWORD },
    });
    assert.equal(login.status, 200);
    assert.match(login.rawCookie, /HttpOnly/i);
    assert.match(login.rawCookie, /SameSite=Lax/i);
    ctx.customer = login.cookie;

    const me = await call("GET", "/api/auth/me", { cookie: ctx.customer });
    assert.equal(me.status, 200);
    assert.equal(me.data.user.email, ctx.customerEmail);
    assert.equal(me.data.user.password, undefined, "password never returned");
    assert.equal(me.data.user.role, "customer");
  });

  it("rejects wrong passwords and operator-injection logins", async () => {
    const wrong = await call("POST", "/api/auth/login", {
      body: { email: ctx.customerEmail, password: "wrong-password" },
    });
    assert.equal(wrong.status, 401);

    const unknown = await call("POST", "/api/auth/login", {
      body: { email: "ghost@example.com", password: PASSWORD },
    });
    assert.equal(unknown.status, 401);
    assert.equal(unknown.data.message, wrong.data.message, "no user enumeration");

    const inject = await call("POST", "/api/auth/login", {
      body: { email: { $ne: null }, password: { $ne: null } },
    });
    assert.equal(inject.status, 400);
  });

  it("requires auth for /me and clears the cookie on logout", async () => {
    assert.equal((await call("GET", "/api/auth/me")).status, 401);

    const forged = await call("GET", "/api/auth/me", {
      cookie: "token=not-a-real-jwt",
    });
    assert.equal(forged.status, 401);

    const out = await call("POST", "/api/auth/logout");
    assert.equal(out.status, 200);
    assert.match(out.rawCookie, /token=;/);
  });
});

describe("google login (token verification mocked)", () => {
  const { OAuth2Client } = require("google-auth-library");
  const realVerify = OAuth2Client.prototype.verifyIdToken;
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  let payload;
  let verifyError;
  let seenAudience;

  before(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    OAuth2Client.prototype.verifyIdToken = async function (options) {
      seenAudience = options.audience;
      if (verifyError) throw verifyError;
      return { getPayload: () => payload };
    };
  });

  after(() => {
    OAuth2Client.prototype.verifyIdToken = realVerify;
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
  });

  const login = (credential = "fake-id-token") =>
    call("POST", "/api/auth/google", { body: { credential } });

  it("requires a credential", async () => {
    assert.equal((await call("POST", "/api/auth/google", { body: {} })).status, 400);
    assert.equal((await login(123)).status, 400);
  });

  it("creates a user, sets the session cookie, and verifies against GOOGLE_CLIENT_ID", async () => {
    verifyError = null;
    payload = {
      sub: "google-sub-1",
      email: "Gita.Google@Example.com",
      email_verified: true,
      name: "Gita",
    };

    const res = await login();
    assert.equal(res.status, 200);
    assert.equal(seenAudience, process.env.GOOGLE_CLIENT_ID);
    assert.equal(res.data.user.email, "gita.google@example.com");
    assert.match(res.rawCookie, /HttpOnly/i);

    const me = await call("GET", "/api/auth/me", { cookie: res.cookie });
    assert.equal(me.status, 200);
    assert.equal(me.data.user.email, "gita.google@example.com");
  });

  it("logs in the same account again without duplicating it", async () => {
    const before = await User.countDocuments({ googleId: "google-sub-1" });
    assert.equal((await login()).status, 200);
    assert.equal(await User.countDocuments({ googleId: "google-sub-1" }), before);
  });

  it("links Google to an existing password account with the same email", async () => {
    const email = `linked_${Date.now()}@example.com`;
    await User.create({ name: "Linked", email, password: await bcrypt.hash(PASSWORD, 4) });
    payload = { sub: "google-sub-2", email, email_verified: true, name: "Linked" };

    assert.equal((await login()).status, 200);
    assert.equal((await User.findOne({ email })).googleId, "google-sub-2");
  });

  it("refuses an email already linked to a different Google account", async () => {
    payload = {
      sub: "google-sub-other",
      email: "gita.google@example.com",
      email_verified: true,
      name: "Impostor",
    };
    // sub differs, so lookup falls back to the email, which has another googleId
    assert.equal((await login()).status, 409);
  });

  it("rejects unverified Google emails", async () => {
    payload = { sub: "google-sub-3", email: "x@example.com", email_verified: false };
    assert.equal((await login()).status, 401);
  });

  it("returns 401 (not 500) when the token fails verification", async () => {
    verifyError = new Error("Wrong recipient, payload audience != requiredAudience");
    const res = await login();
    assert.equal(res.status, 401);
    assert.match(res.data.message, /could not be verified/i);
    verifyError = null;
  });

  it("returns 500 when GOOGLE_CLIENT_ID is not configured on the server", async () => {
    const id = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    try {
      assert.equal((await login()).status, 500);
    } finally {
      process.env.GOOGLE_CLIENT_ID = id;
    }
  });
});

describe("authorization", () => {
  it("blocks anonymous and customer access to every admin surface", async () => {
    const adminRoutes = [
      ["GET", "/api/admin/dashboard"],
      ["GET", "/api/admin/products"],
      ["GET", "/api/admin/categories"],
      ["GET", "/api/admin/reviews"],
      ["GET", "/api/orders/admin/all"],
      ["GET", "/api/users"],
      ["POST", "/api/products"],
      ["POST", "/api/categories"],
    ];

    for (const [method, path] of adminRoutes) {
      const anon = await call(method, path, { body: {} });
      assert.equal(anon.status, 401, `anon ${method} ${path}`);

      const customer = await call(method, path, {
        cookie: ctx.customer,
        body: {},
      });
      assert.equal(customer.status, 403, `customer ${method} ${path}`);
    }
  });

  it("logs the admin in", async () => {
    const login = await call("POST", "/api/auth/login", {
      body: { email: "admin@dhaaga.test", password: PASSWORD },
    });
    assert.equal(login.status, 200);
    assert.equal(login.data.user.role, "admin");
    ctx.admin = login.cookie;
  });
});

describe("admin: categories", () => {
  it("validates input and never 500s on bad payloads", async () => {
    const bad = [
      { name: "" },
      { name: { $ne: null }, slug: "x" },
      { name: "Okay", slug: { $gt: "" } },
      { name: "Okay", slug: "!!!" },
      { name: "Okay", isActive: "yes" },
    ];

    for (const body of bad) {
      const res = await call("POST", "/api/categories", {
        cookie: ctx.admin,
        body,
      });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  it("creates, normalises slugs and rejects duplicates with 409", async () => {
    const created = await call("POST", "/api/categories", {
      cookie: ctx.admin,
      body: { name: "Kurtas", slug: "Kurtas", description: "Classic" },
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.category.slug, "kurtas");
    ctx.catKurtas = created.data.category;

    // Regression: a case-different slug used to slip past the duplicate
    // check and surface as a 500 from the unique index.
    const dupe = await call("POST", "/api/categories", {
      cookie: ctx.admin,
      body: { name: "Other", slug: "KURTAS" },
    });
    assert.equal(dupe.status, 409);

    const kurtis = await call("POST", "/api/categories", {
      cookie: ctx.admin,
      body: { name: "Kurtis" },
    });
    assert.equal(kurtis.status, 201);
    assert.equal(kurtis.data.category.slug, "kurtis", "slug derived from name");
    ctx.catKurtis = kurtis.data.category;
  });

  it("updates, and refuses a slug that belongs to another category", async () => {
    const clash = await call("PUT", `/api/categories/admin/${ctx.catKurtis._id}`, {
      cookie: ctx.admin,
      body: { slug: "kurtas" },
    });
    assert.equal(clash.status, 409);

    const ok = await call("PUT", `/api/categories/admin/${ctx.catKurtis._id}`, {
      cookie: ctx.admin,
      body: { description: "Relaxed fits" },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.category.description, "Relaxed fits");
  });

  it("serves active categories publicly", async () => {
    const list = await call("GET", "/api/categories");
    assert.equal(list.data.categories.length, 2);

    const one = await call("GET", "/api/categories/KURTAS");
    assert.equal(one.status, 200, "slug lookup is case-insensitive");
  });
});

describe("admin: products", () => {
  const variants = [
    { size: "S", color: "Ivory", stock: 3 },
    { size: "M", color: "Ivory", stock: 10 },
  ];

  it("validates product payloads", async () => {
    const base = {
      name: "Test Kurta",
      description: "Soft cotton",
      price: 1000,
      category: undefined,
      variants,
    };
    base.category = ctx.catKurtas._id;

    const bad = [
      { ...base, price: -1 },
      { ...base, price: "1000" },
      { ...base, category: "not-an-id" },
      { ...base, variants: [{ size: "S", color: "Ivory", stock: 1.5 }] },
      { ...base, variants: [variants[0], variants[0]] },
      { ...base, images: [123] },
    ];

    for (const body of bad) {
      const res = await call("POST", "/api/products", {
        cookie: ctx.admin,
        body,
      });
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 80));
    }
  });

  it("creates products and refuses duplicate slugs", async () => {
    const created = await call("POST", "/api/products", {
      cookie: ctx.admin,
      body: {
        name: "Classic Ivory Kurta",
        description: "Soft cotton, mandarin collar",
        price: 1499,
        category: ctx.catKurtas._id,
        images: ["/images/products/ivory.jpg"],
        variants,
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.product.slug, "classic-ivory-kurta");
    ctx.product = created.data.product;

    const dupe = await call("POST", "/api/products", {
      cookie: ctx.admin,
      body: {
        name: "Classic Ivory Kurta",
        description: "again",
        price: 1,
        category: ctx.catKurtas._id,
      },
    });
    assert.equal(dupe.status, 409);

    const second = await call("POST", "/api/products", {
      cookie: ctx.admin,
      body: {
        name: "Sand Beige Kurti",
        description: "Relaxed A-line",
        price: 999,
        category: ctx.catKurtis._id,
        variants: [{ size: "M", color: "Sand", stock: 5 }],
      },
    });
    assert.equal(second.status, 201);
    ctx.product2 = second.data.product;
  });

  it("lists publicly with pagination, search, category and price filters", async () => {
    const all = await call("GET", "/api/products");
    assert.equal(all.data.products.length, 2);
    assert.equal(all.data.pagination.total, 2);
    assert.equal(all.data.pagination.hasNext, false);
    assert.equal(all.data.pagination.hasPrev, false);

    const page = await call("GET", "/api/products?limit=1&page=1");
    assert.equal(page.data.products.length, 1);
    assert.equal(page.data.pagination.pages, 2);
    assert.equal(page.data.pagination.hasNext, true);

    const q = await call("GET", "/api/products?q=beige");
    assert.equal(q.data.products.length, 1);

    // regex metacharacters must be treated literally, not crash
    const meta = await call("GET", "/api/products?q=.*(");
    assert.equal(meta.status, 200);
    assert.equal(meta.data.products.length, 0);

    const cat = await call("GET", "/api/products?category=kurtis");
    assert.equal(cat.data.products.length, 1);

    const price = await call("GET", "/api/products?minPrice=1000");
    assert.equal(price.data.products.length, 1);

    const sorted = await call("GET", "/api/products?sort=price_asc");
    assert.equal(sorted.data.products[0].name, "Sand Beige Kurti");
  });

  it("loads a product by slug publicly and by id for admins", async () => {
    const bySlug = await call("GET", "/api/products/classic-ivory-kurta");
    assert.equal(bySlug.status, 200);

    const byId = await call("GET", `/api/admin/products/${ctx.product._id}`, {
      cookie: ctx.admin,
    });
    assert.equal(byId.status, 200);
    assert.equal(byId.data.product.category.name, "Kurtas");

    const missing = await call(
      "GET",
      "/api/admin/products/64b000000000000000000000",
      { cookie: ctx.admin }
    );
    assert.equal(missing.status, 404);

    const badId = await call("GET", "/api/admin/products/xyz", {
      cookie: ctx.admin,
    });
    assert.equal(badId.status, 400);
  });

  it("updates a product", async () => {
    const res = await call("PUT", `/api/products/${ctx.product._id}`, {
      cookie: ctx.admin,
      body: { price: 1599 },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.product.price, 1599);
  });
});

describe("customer: wishlist, cart, address", () => {
  it("manages the wishlist", async () => {
    const add = await call("POST", "/api/wishlist/items", {
      cookie: ctx.customer,
      body: { productId: ctx.product._id },
    });
    assert.equal(add.status, 200);

    const again = await call("POST", "/api/wishlist/items", {
      cookie: ctx.customer,
      body: { productId: ctx.product._id },
    });
    assert.equal(again.status, 409);

    const list = await call("GET", "/api/wishlist", { cookie: ctx.customer });
    assert.equal(list.data.wishlist.products.length, 1);

    const del = await call("DELETE", `/api/wishlist/items/${ctx.product._id}`, {
      cookie: ctx.customer,
    });
    assert.equal(del.status, 200);
    assert.equal(del.data.wishlist.products.length, 0);
  });

  it("validates and manages the cart", async () => {
    const bad = [
      { productId: ctx.product._id, size: "S", color: "Ivory", quantity: 0 },
      { productId: ctx.product._id, size: "S", color: "Ivory", quantity: 99 },
      { productId: ctx.product._id, size: "XXL", color: "Ivory", quantity: 1 },
      { productId: ctx.product._id, size: "S", color: "Ivory", quantity: 4 },
      { productId: "nope", size: "S", color: "Ivory", quantity: 1 },
    ];

    for (const body of bad) {
      const res = await call("POST", "/api/cart/items", {
        cookie: ctx.customer,
        body,
      });
      assert.equal(res.status, 400, JSON.stringify(body));
    }

    const add = await call("POST", "/api/cart/items", {
      cookie: ctx.customer,
      body: { productId: ctx.product._id, size: "M", color: "Ivory", quantity: 2 },
    });
    assert.equal(add.status, 200);
    assert.equal(add.data.summary.subtotal, 1599 * 2);

    // adding the same variant merges into one line
    const merge = await call("POST", "/api/cart/items", {
      cookie: ctx.customer,
      body: { productId: ctx.product._id, size: "M", color: "Ivory", quantity: 1 },
    });
    assert.equal(merge.data.cart.items.length, 1);
    assert.equal(merge.data.cart.items[0].quantity, 3);

    const itemId = merge.data.cart.items[0]._id;

    const tooMany = await call("PUT", `/api/cart/items/${itemId}`, {
      cookie: ctx.customer,
      body: { quantity: 11 },
    });
    assert.equal(tooMany.status, 400);

    const update = await call("PUT", `/api/cart/items/${itemId}`, {
      cookie: ctx.customer,
      body: { quantity: 2 },
    });
    assert.equal(update.data.summary.itemCount, 2);
  });

  it("validates and manages addresses (first one becomes default)", async () => {
    const bad = await call("POST", "/api/addresses", {
      cookie: ctx.customer,
      body: { fullName: "Aarav", phone: "12345", addressLine1: "x", city: "Pune", state: "MH", pincode: "411001" },
    });
    assert.equal(bad.status, 400);

    const ok = await call("POST", "/api/addresses", {
      cookie: ctx.customer,
      body: {
        fullName: "Aarav Sharma",
        phone: "+91 98765 43210",
        addressLine1: "Flat 101, Silk Enclave",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
      },
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.data.address.isDefault, true);
    assert.equal(ok.data.address.phone, "9876543210");
    ctx.addressId = ok.data.address._id;

    // Regression: numbers that start with "91" used to lose those digits
    // (treated as a country code) and then fail validation.
    const phones = [
      ["9123456789", "9123456789"],
      ["91 91234 56789", "9123456789"],
      ["+91-9123456789", "9123456789"],
      ["09876543210", "9876543210"],
    ];

    for (const [input, expected] of phones) {
      const res = await call("POST", "/api/addresses", {
        cookie: ctx.customer,
        body: {
          fullName: "Phone Check", phone: input, addressLine1: "Road 9",
          city: "Pune", state: "Maharashtra", pincode: "411001",
        },
      });
      assert.equal(res.status, 201, `phone ${input}: ${JSON.stringify(res.data)}`);
      assert.equal(res.data.address.phone, expected, `phone ${input}`);
      await call("DELETE", `/api/addresses/${res.data.address._id}`, { cookie: ctx.customer });
    }

    for (const input of ["12345", "5876543210", "98765432101", "abcdefghij"]) {
      const res = await call("POST", "/api/addresses", {
        cookie: ctx.customer,
        body: {
          fullName: "Phone Check", phone: input, addressLine1: "Road 9",
          city: "Pune", state: "Maharashtra", pincode: "411001",
        },
      });
      assert.equal(res.status, 400, `invalid phone ${input}`);
    }

    const second = await call("POST", "/api/addresses", {
      cookie: ctx.customer,
      body: {
        fullName: "Aarav Sharma",
        phone: "9876543210",
        addressLine1: "Office",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        isDefault: true,
      },
    });
    assert.equal(second.status, 201);

    const list = await call("GET", "/api/addresses", { cookie: ctx.customer });
    assert.equal(list.data.addresses.filter((a) => a.isDefault).length, 1);
  });

  it("does not let one customer touch another's address", async () => {
    const other = await registerAndLogin("Other", `other_${Date.now()}@example.com`);
    const res = await call("DELETE", `/api/addresses/${ctx.addressId}`, {
      cookie: other,
    });
    assert.equal(res.status, 404);
    ctx.other = other;
  });
});

describe("orders and inventory", () => {
  it("rejects an invalid checkout", async () => {
    const noMethod = await call("POST", "/api/orders", {
      cookie: ctx.customer,
      body: { addressId: ctx.addressId },
    });
    assert.equal(noMethod.status, 400);

    const badAddress = await call("POST", "/api/orders", {
      cookie: ctx.customer,
      body: { addressId: "64b000000000000000000000", paymentMethod: "cod" },
    });
    assert.equal(badAddress.status, 404);

    const emptyCart = await call("POST", "/api/orders", {
      cookie: ctx.other,
      body: { addressId: ctx.addressId, paymentMethod: "cod" },
    });
    assert.equal(emptyCart.status, 400);
  });

  it("places a COD order, prices it server-side and deducts stock", async () => {
    const before = await stockOf(ctx.product._id, "M", "Ivory");

    const res = await call("POST", "/api/orders", {
      cookie: ctx.customer,
      body: { addressId: ctx.addressId, paymentMethod: "cod" },
    });
    assert.equal(res.status, 201);

    const order = res.data.order;
    ctx.order = order;
    assert.match(order.orderNumber, /^DHAAGA-/);
    assert.equal(order.subtotal, 1599 * 2);
    assert.equal(order.shippingFee, 0, "free shipping over threshold");
    assert.equal(order.totalAmount, 1599 * 2);
    assert.equal(order.orderStatus, "pending");
    assert.equal(order.paymentStatus, "pending");
    assert.equal(order.shippingAddress.city, "Pune", "snapshot of the chosen address");

    assert.equal(await stockOf(ctx.product._id, "M", "Ivory"), before - 2);

    const cart = await call("GET", "/api/cart", { cookie: ctx.customer });
    assert.equal(cart.data.cart.items.length, 0, "cart emptied");
  });

  it("charges shipping under the free-shipping threshold", async () => {
    await call("POST", "/api/cart/items", {
      cookie: ctx.customer,
      body: { productId: ctx.product2._id, size: "M", color: "Sand", quantity: 1 },
    });

    // The cart summary must quote exactly what the order will charge, so the
    // frontend never needs its own shipping constants.
    const cart = await call("GET", "/api/cart", { cookie: ctx.customer });
    assert.equal(cart.data.summary.subtotal, 999);
    assert.equal(cart.data.summary.shippingFee, 99);
    assert.equal(cart.data.summary.total, 999 + 99);
    assert.equal(cart.data.summary.freeShippingThreshold, 1999);

    const res = await call("POST", "/api/orders", {
      cookie: ctx.customer,
      body: { addressId: ctx.addressId, paymentMethod: "cod" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.order.shippingFee, cart.data.summary.shippingFee);
    assert.equal(res.data.order.shippingFee, 99);
    assert.equal(res.data.order.totalAmount, cart.data.summary.total);
    ctx.order2 = res.data.order;
  });

  it("never oversells the last unit", async () => {
    // product has S/Ivory stock = 3; two customers each want 2
    const buyerA = ctx.customer;
    const buyerB = ctx.other;

    const addrRes = await call("POST", "/api/addresses", {
      cookie: buyerB,
      body: {
        fullName: "Other", phone: "9123456789", addressLine1: "Road 1",
        city: "Delhi", state: "Delhi", pincode: "110001",
      },
    });
    assert.equal(addrRes.status, 201, JSON.stringify(addrRes.data));
    const addrB = (await call("GET", "/api/addresses", { cookie: buyerB })).data
      .addresses[0]._id;

    for (const cookie of [buyerA, buyerB]) {
      const add = await call("POST", "/api/cart/items", {
        cookie,
        body: { productId: ctx.product._id, size: "S", color: "Ivory", quantity: 2 },
      });
      assert.equal(add.status, 200);
    }

    const [a, b] = await Promise.all([
      call("POST", "/api/orders", { cookie: buyerA, body: { addressId: ctx.addressId, paymentMethod: "cod" } }),
      call("POST", "/api/orders", { cookie: buyerB, body: { addressId: addrB, paymentMethod: "cod" } }),
    ]);

    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [201, 409], "exactly one buyer wins");
    assert.equal(await stockOf(ctx.product._id, "S", "Ivory"), 1, "stock never negative");

    ctx.smallOrder = (a.status === 201 ? a : b).data.order;

    // clear the loser's cart so later tests start clean
    await call("DELETE", "/api/cart", { cookie: buyerA });
    await call("DELETE", "/api/cart", { cookie: buyerB });
  });

  it("lists my orders (paginated) and only my orders", async () => {
    const mine = await call("GET", "/api/orders", { cookie: ctx.customer });
    assert.equal(mine.status, 200);
    assert.ok(mine.data.orders.length >= 2);
    assert.equal(mine.data.pagination.total, mine.data.orders.length);

    const detail = await call("GET", `/api/orders/${ctx.order._id}`, { cookie: ctx.customer });
    assert.equal(detail.status, 200);

    const stolen = await call("GET", `/api/orders/${ctx.order._id}`, { cookie: ctx.other });
    assert.equal(stolen.status, 404, "other customers cannot read it");
  });

  it("lets admins search/filter orders and open one", async () => {
    const all = await call("GET", "/api/orders/admin/all", { cookie: ctx.admin });
    assert.equal(all.status, 200);
    assert.ok(all.data.orders.length >= 3);
    assert.equal(all.data.orders[0].user.email !== undefined, true, "user populated");

    const search = await call(
      "GET",
      `/api/orders/admin/all?q=${encodeURIComponent(ctx.order.orderNumber.slice(0, 14))}`,
      { cookie: ctx.admin }
    );
    assert.ok(search.data.orders.some((o) => o._id === ctx.order._id));

    const pending = await call("GET", "/api/orders/admin/all?status=pending", { cookie: ctx.admin });
    assert.ok(pending.data.orders.every((o) => o.orderStatus === "pending"));

    const one = await call("GET", `/api/orders/admin/${ctx.order._id}`, { cookie: ctx.admin });
    assert.equal(one.status, 200);
  });

  it("enforces the order status lifecycle", async () => {
    const put = (id, orderStatus) =>
      call("PUT", `/api/orders/admin/${id}/status`, { cookie: ctx.admin, body: { orderStatus } });

    assert.equal((await put(ctx.order._id, "bogus")).status, 400);
    assert.equal((await put(ctx.order._id, "pending")).status, 400, "cannot repeat");

    for (const status of ["confirmed", "processing", "shipped"]) {
      assert.equal((await put(ctx.order._id, status)).status, 200, status);
    }

    assert.equal((await put(ctx.order._id, "cancelled")).status, 400, "no cancel after shipping");

    const delivered = await put(ctx.order._id, "delivered");
    assert.equal(delivered.status, 200);
    assert.equal(delivered.data.order.paymentStatus, "paid", "COD collected on delivery");

    assert.equal((await put(ctx.order._id, "shipped")).status, 400, "delivered is final");
  });

  it("restores stock when an order is cancelled", async () => {
    const before = await stockOf(ctx.product2._id, "M", "Sand");

    const cancel = await call("PUT", `/api/orders/admin/${ctx.order2._id}/status`, {
      cookie: ctx.admin,
      body: { orderStatus: "cancelled" },
    });
    assert.equal(cancel.status, 200);
    assert.equal(await stockOf(ctx.product2._id, "M", "Sand"), before + 1);

    const again = await call("PUT", `/api/orders/admin/${ctx.order2._id}/status`, {
      cookie: ctx.admin,
      body: { orderStatus: "cancelled" },
    });
    assert.equal(again.status, 400, "cannot cancel twice (no double restock)");
    assert.equal(await stockOf(ctx.product2._id, "M", "Sand"), before + 1);
  });
});

describe("razorpay payments (SDK mocked)", () => {
  const addToCart = () =>
    call("POST", "/api/cart/items", {
      cookie: ctx.customer,
      body: { productId: ctx.product2._id, size: "M", color: "Sand", quantity: 1 },
    });

  const cartSize = async (cookie) =>
    (await call("GET", "/api/cart", { cookie })).data.cart.items.length;

  it("creates a Razorpay order from the server-side total and keeps the cart", async () => {
    const stockBefore = await stockOf(ctx.product2._id, "M", "Sand");
    assert.equal((await addToCart()).status, 200);

    const res = await call("POST", "/api/orders", {
      cookie: ctx.customer,
      body: {
        addressId: ctx.addressId,
        paymentMethod: "razorpay",
        totalAmount: 1, // client-sent totals must be ignored
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));

    // 999 + 99 shipping, in paise
    assert.equal(razorpayMock.calls.at(-1).amount, (999 + 99) * 100);
    assert.equal(res.data.razorpay.amount, (999 + 99) * 100);
    assert.equal(res.data.razorpay.keyId, "rzp_test_mock");
    assert.equal(res.data.order.paymentStatus, "pending");
    assert.ok(!JSON.stringify(res.data).includes("mock_razorpay_secret"), "secret never returned");

    const saved = await Order.findById(res.data.order._id);
    assert.equal(saved.razorpayOrderId, res.data.razorpay.orderId);

    assert.equal(await stockOf(ctx.product2._id, "M", "Sand"), stockBefore - 1);
    assert.equal(await cartSize(ctx.customer), 1, "cart kept until payment is verified");

    ctx.rzp = {
      orderId: res.data.order._id,
      razorpayOrderId: res.data.razorpay.orderId,
      stockBefore,
    };
  });

  it("rejects a tampered signature and leaves the order unpaid", async () => {
    const res = await call("POST", "/api/orders/razorpay/verify", {
      cookie: ctx.customer,
      body: {
        razorpay_order_id: ctx.rzp.razorpayOrderId,
        razorpay_payment_id: "pay_mock_1",
        razorpay_signature: "0".repeat(64),
      },
    });
    assert.equal(res.status, 400);

    const order = await Order.findById(ctx.rzp.orderId);
    assert.equal(order.paymentStatus, "pending");
    assert.equal(order.orderStatus, "pending");
    assert.equal(await cartSize(ctx.customer), 1);

    const malformed = await call("POST", "/api/orders/razorpay/verify", {
      cookie: ctx.customer,
      body: { razorpay_order_id: { $ne: "" }, razorpay_payment_id: "x", razorpay_signature: "y" },
    });
    assert.equal(malformed.status, 400, "non-string input is rejected");
  });

  it("does not let another customer verify someone else's order", async () => {
    const res = await call("POST", "/api/orders/razorpay/verify", {
      cookie: ctx.other,
      body: {
        razorpay_order_id: ctx.rzp.razorpayOrderId,
        razorpay_payment_id: "pay_mock_1",
        razorpay_signature: signPayment(ctx.rzp.razorpayOrderId, "pay_mock_1"),
      },
    });
    assert.equal(res.status, 404);
    assert.equal((await Order.findById(ctx.rzp.orderId)).paymentStatus, "pending");
  });

  it("marks the order paid on a valid signature, clears the cart, and is idempotent", async () => {
    const body = {
      razorpay_order_id: ctx.rzp.razorpayOrderId,
      razorpay_payment_id: "pay_mock_1",
      razorpay_signature: signPayment(ctx.rzp.razorpayOrderId, "pay_mock_1"),
    };

    const res = await call("POST", "/api/orders/razorpay/verify", {
      cookie: ctx.customer,
      body,
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.order.paymentStatus, "paid");
    assert.equal(res.data.order.orderStatus, "confirmed");
    assert.equal(res.data.order.paymentId, "pay_mock_1");
    assert.equal(await cartSize(ctx.customer), 0);

    const again = await call("POST", "/api/orders/razorpay/verify", {
      cookie: ctx.customer,
      body,
    });
    assert.equal(again.status, 200);
    assert.equal(again.data.order.paymentStatus, "paid");

    assert.equal(
      await stockOf(ctx.product2._id, "M", "Sand"),
      ctx.rzp.stockBefore - 1,
      "stock deducted exactly once"
    );
  });

  it("returns 502 and restores stock when Razorpay rejects the credentials", async () => {
    assert.equal((await addToCart()).status, 200);
    const stockBefore = await stockOf(ctx.product2._id, "M", "Sand");
    const ordersBefore = await Order.countDocuments();

    const failure = new Error("Authentication failed");
    failure.statusCode = 401;
    razorpayMock.failWith = failure;

    try {
      const res = await call("POST", "/api/orders", {
        cookie: ctx.customer,
        body: { addressId: ctx.addressId, paymentMethod: "razorpay" },
      });
      assert.equal(res.status, 502);
    } finally {
      razorpayMock.failWith = null;
    }

    assert.equal(await stockOf(ctx.product2._id, "M", "Sand"), stockBefore);
    assert.equal(await Order.countDocuments(), ordersBefore, "no orphan order");
    assert.equal(await cartSize(ctx.customer), 1, "cart intact");

    await call("DELETE", "/api/cart", { cookie: ctx.customer });
  });
});

describe("razorpay webhook and abandoned orders (SDK mocked)", () => {
  const addToCart = () =>
    call("POST", "/api/cart/items", {
      cookie: ctx.customer,
      body: { productId: ctx.product2._id, size: "M", color: "Sand", quantity: 1 },
    });

  const startCheckout = async () => {
    assert.equal((await addToCart()).status, 200);
    const res = await call("POST", "/api/orders", {
      cookie: ctx.customer,
      body: { addressId: ctx.addressId, paymentMethod: "razorpay" },
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    return {
      id: res.data.order._id,
      razorpayOrderId: res.data.razorpay.orderId,
      amount: res.data.razorpay.amount,
    };
  };

  const sendWebhook = async (payload, signature) => {
    const raw = JSON.stringify(payload);
    const sig =
      signature ??
      crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest("hex");

    const response = await fetch(`${baseUrl}/api/orders/razorpay/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Razorpay-Signature": sig },
      body: raw,
    });
    return response.status;
  };

  const captured = (order, overrides = {}) => ({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_wh_1",
          order_id: order.razorpayOrderId,
          amount: order.amount,
          currency: "INR",
          ...overrides,
        },
      },
    },
  });

  const cartSize = async () =>
    (await call("GET", "/api/cart", { cookie: ctx.customer })).data.cart.items.length;

  it("releases a shopper's abandoned attempt when they start a new one", async () => {
    const stock0 = await stockOf(ctx.product2._id, "M", "Sand");

    const first = await startCheckout();
    assert.equal(await stockOf(ctx.product2._id, "M", "Sand"), stock0 - 1);

    const second = await startCheckout();
    assert.equal(await stockOf(ctx.product2._id, "M", "Sand"), stock0 - 1, "held once, not twice");

    const abandoned = await Order.findById(first.id);
    assert.equal(abandoned.orderStatus, "cancelled");
    assert.equal(abandoned.paymentStatus, "failed");
    assert.equal((await Order.findById(second.id)).paymentStatus, "pending");

    ctx.wh = { second, stock0 };
  });

  it("rejects webhooks with a missing or wrong signature", async () => {
    const payload = captured(ctx.wh.second);
    assert.equal(await sendWebhook(payload, "0".repeat(64)), 400);
    assert.equal(await sendWebhook(payload, ""), 400);
    assert.equal((await Order.findById(ctx.wh.second.id)).paymentStatus, "pending");
  });

  it("ignores a captured event whose amount does not match the order", async () => {
    const status = await sendWebhook(captured(ctx.wh.second, { amount: 100 }));
    assert.equal(status, 200);
    assert.equal((await Order.findById(ctx.wh.second.id)).paymentStatus, "pending");
  });

  it("finalises the order from payment.captured even if the tab was closed, idempotently", async () => {
    assert.equal(await sendWebhook(captured(ctx.wh.second)), 200);

    const order = await Order.findById(ctx.wh.second.id);
    assert.equal(order.paymentStatus, "paid");
    assert.equal(order.orderStatus, "confirmed");
    assert.equal(order.paymentId, "pay_wh_1");
    assert.equal(await cartSize(), 0, "cart cleared");

    assert.equal(await sendWebhook(captured(ctx.wh.second)), 200, "replay is harmless");
    assert.equal(await stockOf(ctx.product2._id, "M", "Sand"), ctx.wh.stock0 - 1, "stock deducted once");
  });

  it("acknowledges payment.failed without changing the order", async () => {
    const pending = await startCheckout();
    const status = await sendWebhook({
      event: "payment.failed",
      payload: { payment: { entity: { id: "pay_fail_1", order_id: pending.razorpayOrderId } } },
    });
    assert.equal(status, 200);
    assert.equal((await Order.findById(pending.id)).orderStatus, "pending");
    ctx.wh.pending = pending;
  });

  it("releases expired unpaid orders, and a late payment re-reserves the stock", async () => {
    const stockHeld = await stockOf(ctx.product2._id, "M", "Sand");

    const released = await releaseExpiredRazorpayOrders(Date.now() + 31 * 60 * 1000);
    assert.equal(released, 1);
    assert.equal(await stockOf(ctx.product2._id, "M", "Sand"), stockHeld + 1);
    assert.equal((await Order.findById(ctx.wh.pending.id)).orderStatus, "cancelled");

    assert.equal(
      await sendWebhook(captured(ctx.wh.pending, { id: "pay_late_1" })),
      200
    );

    const order = await Order.findById(ctx.wh.pending.id);
    assert.equal(order.paymentStatus, "paid");
    assert.equal(order.orderStatus, "confirmed");
    assert.equal(await stockOf(ctx.product2._id, "M", "Sand"), stockHeld, "stock reserved again");

    await call("DELETE", "/api/cart", { cookie: ctx.customer });
  });
});

describe("reviews", () => {
  it("only lets buyers review delivered products, once", async () => {
    // order2 was cancelled, so it can never be reviewed
    const notDelivered = await call("POST", "/api/reviews", {
      cookie: ctx.customer,
      body: { productId: ctx.product2._id, orderId: ctx.order2._id, rating: 5, comment: "too early" },
    });
    assert.equal(notDelivered.status, 400);

    const badRating = await call("POST", "/api/reviews", {
      cookie: ctx.customer,
      body: { productId: ctx.product._id, orderId: ctx.order._id, rating: 9, comment: "x" },
    });
    assert.equal(badRating.status, 400);

    const wrongProduct = await call("POST", "/api/reviews", {
      cookie: ctx.customer,
      body: { productId: ctx.product2._id, orderId: ctx.order._id, rating: 5, comment: "never bought" },
    });
    assert.equal(wrongProduct.status, 403);

    const stranger = await call("POST", "/api/reviews", {
      cookie: ctx.other,
      body: { productId: ctx.product._id, orderId: ctx.order._id, rating: 5, comment: "not mine" },
    });
    assert.equal(stranger.status, 404);

    const ok = await call("POST", "/api/reviews", {
      cookie: ctx.customer,
      body: { productId: ctx.product._id, orderId: ctx.order._id, rating: 4, comment: "Lovely fabric" },
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.data.review.verifiedPurchase, true);
    ctx.review = ok.data.review;

    const dupe = await call("POST", "/api/reviews", {
      cookie: ctx.customer,
      body: { productId: ctx.product._id, orderId: ctx.order._id, rating: 5, comment: "again" },
    });
    assert.equal(dupe.status, 409);
  });

  it("publishes approved reviews with an average, and hides moderated ones", async () => {
    const pub = await call("GET", `/api/reviews/product/${ctx.product._id}`);
    assert.equal(pub.data.reviews.length, 1);
    assert.equal(pub.data.summary.averageRating, 4);

    const hide = await call("PUT", `/api/admin/reviews/${ctx.review._id}/approval`, {
      cookie: ctx.admin,
      body: { isApproved: false },
    });
    assert.equal(hide.status, 200);

    const after = await call("GET", `/api/reviews/product/${ctx.product._id}`);
    assert.equal(after.data.reviews.length, 0);
    assert.equal(after.data.summary.count, 0);

    const queue = await call("GET", "/api/admin/reviews?approved=false", { cookie: ctx.admin });
    assert.equal(queue.data.reviews.length, 1);

    const badBody = await call("PUT", `/api/admin/reviews/${ctx.review._id}/approval`, {
      cookie: ctx.admin,
      body: { isApproved: "no" },
    });
    assert.equal(badBody.status, 400);
  });
});

describe("admin: dashboard, categories overview, users", () => {
  it("reports accurate dashboard analytics", async () => {
    const res = await call("GET", "/api/admin/dashboard", { cookie: ctx.admin });
    assert.equal(res.status, 200);

    const { stats, ordersByStatus, salesByDay, topProducts, lowStock } = res.data;

    assert.equal(stats.totalUsers, 3);
    assert.equal(stats.totalProducts, 2);
    assert.equal(stats.totalCategories, 2);
    assert.equal(stats.totalOrders, 3);
    assert.equal(stats.deliveredOrders, 1);
    assert.equal(stats.totalRevenue, 1599 * 2, "only paid (delivered COD) counts");

    assert.equal(ordersByStatus.delivered, 1);
    assert.equal(ordersByStatus.cancelled, 1);
    assert.equal(ordersByStatus.pending, 1);

    assert.equal(salesByDay.length, 14);
    const today = salesByDay[salesByDay.length - 1];
    // cancelled order is excluded from sales, the other two are counted
    assert.equal(today.orders, 2);

    assert.ok(topProducts.length >= 1);
    assert.equal(topProducts[0].name, "Classic Ivory Kurta");

    assert.ok(
      lowStock.some((row) => row.slug === "classic-ivory-kurta" && row.size === "S" && row.stock === 1),
      "S/Ivory (stock 1) is flagged low"
    );
    assert.ok(lowStock.every((row) => row.stock <= res.data.lowStockThreshold));
  });

  it("lists admin products incl. inactive, and deactivates/reactivates", async () => {
    const del = await call("DELETE", `/api/products/${ctx.product2._id}`, { cookie: ctx.admin });
    assert.equal(del.status, 200);

    const pub = await call("GET", "/api/products");
    assert.equal(pub.data.products.length, 1, "hidden from storefront");
    assert.equal((await call("GET", "/api/products/sand-beige-kurti")).status, 404);

    const inactive = await call("GET", "/api/admin/products?status=inactive", { cookie: ctx.admin });
    assert.equal(inactive.data.products.length, 1);

    const back = await call("PUT", `/api/products/${ctx.product2._id}`, {
      cookie: ctx.admin,
      body: { isActive: true },
    });
    assert.equal(back.status, 200);
    assert.equal((await call("GET", "/api/products/sand-beige-kurti")).status, 200);
  });

  it("shows product counts per category and soft-deletes categories", async () => {
    const cats = await call("GET", "/api/admin/categories", { cookie: ctx.admin });
    const kurtas = cats.data.categories.find((c) => c.slug === "kurtas");
    assert.equal(kurtas.productCount, 1);

    const del = await call("DELETE", `/api/categories/admin/${ctx.catKurtis._id}`, { cookie: ctx.admin });
    assert.equal(del.status, 200);
    assert.equal(del.data.affectedProducts, 1);

    const pub = await call("GET", "/api/products");
    assert.equal(pub.data.products.length, 1, "products of inactive categories are hidden");

    const stillListed = await call("GET", "/api/admin/categories", { cookie: ctx.admin });
    assert.equal(stillListed.data.categories.length, 2, "admin still sees inactive ones");
  });

  it("lists users with search, role filter and pagination", async () => {
    const all = await call("GET", "/api/users", { cookie: ctx.admin });
    assert.equal(all.status, 200);
    assert.equal(all.data.pagination.total, 3);
    assert.equal(all.data.users[0].password, undefined);

    const admins = await call("GET", "/api/users?role=admin", { cookie: ctx.admin });
    assert.equal(admins.data.users.length, 1);

    const search = await call("GET", "/api/users?q=AARAV", { cookie: ctx.admin });
    assert.equal(search.data.users.length, 1);

    const page = await call("GET", "/api/users?limit=2", { cookie: ctx.admin });
    assert.equal(page.data.users.length, 2);
    assert.equal(page.data.pagination.hasNext, true);

    const one = await call("GET", `/api/users/${ctx.review.user}`, { cookie: ctx.admin });
    assert.equal(one.status, 200);
    assert.ok(one.data.orderCount >= 1);
  });

  it("changes roles, but never lets an admin demote themselves", async () => {
    const me = await call("GET", "/api/auth/me", { cookie: ctx.admin });

    const self = await call("PUT", `/api/users/${me.data.user._id}/role`, {
      cookie: ctx.admin,
      body: { role: "customer" },
    });
    assert.equal(self.status, 400);

    const bad = await call("PUT", `/api/users/${ctx.review.user}/role`, {
      cookie: ctx.admin,
      body: { role: "superuser" },
    });
    assert.equal(bad.status, 400);

    const promote = await call("PUT", `/api/users/${ctx.review.user}/role`, {
      cookie: ctx.admin,
      body: { role: "admin" },
    });
    assert.equal(promote.status, 200);

    // role changes apply immediately (no stale-JWT window)
    const nowAdmin = await call("GET", "/api/admin/dashboard", { cookie: ctx.customer });
    assert.equal(nowAdmin.status, 200);

    const demote = await call("PUT", `/api/users/${ctx.review.user}/role`, {
      cookie: ctx.admin,
      body: { role: "customer" },
    });
    assert.equal(demote.status, 200);
    assert.equal((await call("GET", "/api/admin/dashboard", { cookie: ctx.customer })).status, 403);
  });
});

describe("razorpay refunds (SDK mocked)", () => {
  let adminCookie;
  let customerCookie;
  let customerId;
  let refundProduct;
  let seq = 0;

  before(async () => {
    const login = await call("POST", "/api/auth/login", {
      body: { email: "admin@dhaaga.test", password: PASSWORD },
    });
    assert.equal(login.status, 200);
    adminCookie = login.cookie;

    // Self-contained: own customer, category and product, so this block does
    // not depend on state left behind by earlier blocks.
    const email = `refund_${Date.now()}@example.com`;
    customerCookie = await registerAndLogin("Refund Customer", email);
    customerId = (await User.findOne({ email }))._id;

    const category = await require("../models/Category").create({
      name: "Refund Test Category",
      slug: "refund-test-category",
    });
    const created = await call("POST", "/api/products", {
      cookie: adminCookie,
      body: {
        name: "Refund Test Kurta",
        description: "For refund tests",
        price: 999,
        category: category._id,
        variants: [{ size: "M", color: "Sand", stock: 5 }],
      },
    });
    assert.equal(created.status, 201);
    refundProduct = created.data.product;
  });

  // A paid online order, created directly so the refund rules can be tested
  // in isolation from checkout.
  const paidOnlineOrder = async (overrides = {}) => {
    seq += 1;
    return Order.create({
      user: customerId,
      items: [
        {
          product: refundProduct._id,
          productName: "Refund test kurta",
          size: "M",
          color: "Sand",
          price: 999,
          quantity: 1,
        },
      ],
      shippingAddress: {
        fullName: "Aarav Sharma",
        phone: "9876543210",
        addressLine1: "12 MG Road",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
      },
      subtotal: 999,
      shippingFee: 99,
      totalAmount: 1098,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      orderStatus: "confirmed",
      paymentId: `pay_refund_${seq}`,
      razorpayOrderId: `order_refund_${seq}`,
      orderNumber: `DHG-REFUND-${seq}`,
      ...overrides,
    });
  };

  const cancel = (id) =>
    call("PUT", `/api/orders/admin/${id}/status`, {
      cookie: adminCookie,
      body: { orderStatus: "cancelled" },
    });

  it("refunds the full amount when an admin cancels a paid online order", async () => {
    const order = await paidOnlineOrder();
    razorpayMock.refunds.length = 0;
    const stockBefore = await stockOf(refundProduct._id, "M", "Sand");

    const res = await cancel(order._id);

    assert.equal(res.status, 200);
    assert.equal(res.data.refund.status, "refunded");
    assert.equal(razorpayMock.refunds.length, 1);
    assert.equal(razorpayMock.refunds[0].paymentId, order.paymentId);
    assert.equal(razorpayMock.refunds[0].params.amount, 1098 * 100);

    const saved = await Order.findById(order._id);
    assert.equal(saved.orderStatus, "cancelled");
    assert.equal(saved.paymentStatus, "refunded");
    assert.equal(saved.refundStatus, "succeeded");
    assert.match(saved.refundId, /^rfnd_mock_/);
    assert.equal(await stockOf(refundProduct._id, "M", "Sand"), stockBefore + 1, "stock restored");
  });

  it("does not refund twice if the order is cancelled again or the refund is retried", async () => {
    const order = await paidOnlineOrder();
    razorpayMock.refunds.length = 0;

    assert.equal((await cancel(order._id)).status, 200);
    assert.equal((await cancel(order._id)).status, 400, "cancelled is final");

    const retry = await call("POST", `/api/orders/admin/${order._id}/refund`, { cookie: adminCookie });
    assert.equal(retry.status, 200);
    assert.equal(retry.data.refund.status, "refunded");
    assert.equal(razorpayMock.refunds.length, 1, "Razorpay was called exactly once");
  });

  it("cancels but keeps the order paid when Razorpay rejects the refund, then retries successfully", async () => {
    const order = await paidOnlineOrder();
    razorpayMock.refunds.length = 0;
    razorpayMock.refundFailWith = {
      statusCode: 400,
      error: { description: "Insufficient balance for refund" },
    };

    const failed = await cancel(order._id);
    razorpayMock.refundFailWith = null;

    assert.equal(failed.status, 200, "the cancellation itself still succeeds");
    assert.equal(failed.data.refund.status, "failed");
    assert.match(failed.data.message, /refund failed/i);

    const saved = await Order.findById(order._id);
    assert.equal(saved.orderStatus, "cancelled");
    assert.equal(saved.paymentStatus, "paid", "money not returned yet, so still paid");
    assert.equal(saved.refundStatus, "failed");
    assert.match(saved.refundError, /Insufficient balance/);

    const retry = await call("POST", `/api/orders/admin/${order._id}/refund`, { cookie: adminCookie });
    assert.equal(retry.status, 200);
    assert.equal((await Order.findById(order._id)).paymentStatus, "refunded");
  });

  it("does not call Razorpay when cancelling COD or unpaid online orders", async () => {
    const cod = await paidOnlineOrder({
      paymentMethod: "cod",
      paymentStatus: "pending",
      paymentId: "",
      razorpayOrderId: "",
    });
    const unpaid = await paidOnlineOrder({ paymentStatus: "pending", paymentId: "" });
    razorpayMock.refunds.length = 0;

    for (const order of [cod, unpaid]) {
      const res = await cancel(order._id);
      assert.equal(res.status, 200);
      assert.equal(res.data.refund, undefined);
    }

    assert.equal(razorpayMock.refunds.length, 0);
  });

  it("only lets admins retry refunds, and only for paid cancelled online orders", async () => {
    const order = await paidOnlineOrder();

    const anon = await call("POST", `/api/orders/admin/${order._id}/refund`);
    assert.equal(anon.status, 401);

    const customer = await call("POST", `/api/orders/admin/${order._id}/refund`, { cookie: customerCookie });
    assert.equal(customer.status, 403);

    const notCancelled = await call("POST", `/api/orders/admin/${order._id}/refund`, { cookie: adminCookie });
    assert.equal(notCancelled.status, 400);
  });

  it("refunds automatically when a payment arrives for an order an admin already cancelled", async () => {
    const order = await paidOnlineOrder({
      paymentStatus: "pending",
      orderStatus: "cancelled",
      paymentId: "",
    });
    razorpayMock.refunds.length = 0;

    const { markOrderPaid } = require("../services/order.service");
    await markOrderPaid(order._id, "pay_late_after_admin_cancel");

    assert.equal(razorpayMock.refunds.length, 1);
    assert.equal(razorpayMock.refunds[0].paymentId, "pay_late_after_admin_cancel");

    const saved = await Order.findById(order._id);
    assert.equal(saved.orderStatus, "cancelled", "not fulfilled");
    assert.equal(saved.paymentStatus, "refunded");
  });

  it("the sweeper retries refunds that failed earlier", async () => {
    const order = await paidOnlineOrder({
      orderStatus: "cancelled",
      refundStatus: "failed",
      refundError: "Gateway timeout",
    });
    razorpayMock.refunds.length = 0;

    const { runSweep } = require("../services/order.service");
    const summary = await runSweep();

    assert.ok(summary.refundsRetried >= 1);
    assert.equal((await Order.findById(order._id)).paymentStatus, "refunded");
    assert.equal(razorpayMock.refunds.at(-1).paymentId, order.paymentId);
  });
});
