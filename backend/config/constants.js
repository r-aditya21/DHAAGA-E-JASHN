// Central place for business rules so they are not scattered as magic numbers.

const num = (value, fallback) => {
  const parsed = Number(value);
  return value !== undefined && value !== "" && Number.isFinite(parsed)
    ? parsed
    : fallback;
};

// Order lifecycle. Forward-only, except "cancelled" which is allowed
// only before an order is shipped.
const ORDER_FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"];
const ORDER_STATUSES = [...ORDER_FLOW, "cancelled"];

const canTransitionOrder = (from, to) => {
  if (from === "delivered" || from === "cancelled") return false;
  if (to === "cancelled") {
    return ORDER_FLOW.indexOf(from) < ORDER_FLOW.indexOf("shipped");
  }
  return ORDER_FLOW.indexOf(to) > ORDER_FLOW.indexOf(from);
};

module.exports = {
  FREE_SHIPPING_THRESHOLD: num(process.env.FREE_SHIPPING_THRESHOLD, 1999),
  SHIPPING_FEE: num(process.env.SHIPPING_FEE, 99),
  MAX_CART_ITEM_QUANTITY: 10,
  ORDER_FLOW,
  ORDER_STATUSES,
  canTransitionOrder,
};
