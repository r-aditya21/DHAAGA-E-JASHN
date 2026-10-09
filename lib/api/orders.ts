import { apiFetch } from "./client";

export type OrderItem = {
  _id: string;
  product: string;
  productName: string;
  productImage: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
};

export type ShippingAddressSnapshot = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type Order = {
  _id: string;
  user: string | { _id: string; name: string; email: string };
  items: OrderItem[];
  shippingAddress: ShippingAddressSnapshot;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: "cod" | "razorpay";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  orderStatus:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  paymentId?: string;
  razorpayOrderId?: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderResponse = {
  message: string;
  order: Order;
  razorpay?: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  };
};

export type VerifyRazorpayPaymentResponse = {
  message: string;
  order: Order;
};

export async function createOrder(data: {
  addressId: string;
  paymentMethod: "cod" | "razorpay";
}): Promise<CreateOrderResponse> {
  return apiFetch<CreateOrderResponse>("/orders", {
    method: "POST",
    body: data,
  });
}

export async function verifyRazorpayPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<VerifyRazorpayPaymentResponse> {
  return apiFetch<VerifyRazorpayPaymentResponse>("/orders/razorpay/verify", {
    method: "POST",
    body: data,
  });
}

export async function getMyOrders(): Promise<{ orders: Order[] }> {
  return apiFetch<{ orders: Order[] }>("/orders");
}

export async function getOrderById(id: string): Promise<{ order: Order }> {
  return apiFetch<{ order: Order }>(`/orders/${id}`);
}
