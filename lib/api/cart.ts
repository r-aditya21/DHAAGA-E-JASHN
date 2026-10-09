import { apiFetch } from "./client";
import { Product } from "./products";

export type CartItem = {
  _id: string;
  product: Product;
  size: string;
  color: string;
  quantity: number;
};

export type CartSummary = {
  subtotal: number;
  itemCount: number;
  hasUnavailableItems: boolean;
  // Computed by the server; the frontend must not recompute shipping.
  shippingFee: number;
  total: number;
  freeShippingThreshold: number;
};

export type Cart = {
  _id: string;
  user: string;
  items: CartItem[];
};

export type CartResponse = {
  cart: Cart;
  summary: CartSummary;
  message?: string;
};

export async function getCart(): Promise<CartResponse> {
  return apiFetch<CartResponse>("/cart");
}

export async function addToCart(data: {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}): Promise<CartResponse> {
  return apiFetch<CartResponse>("/cart/items", {
    method: "POST",
    body: data,
  });
}

export async function updateCartItem(
  itemId: string,
  quantity: number
): Promise<CartResponse> {
  return apiFetch<CartResponse>(`/cart/items/${itemId}`, {
    method: "PUT",
    body: { quantity },
  });
}

export async function removeCartItem(itemId: string): Promise<CartResponse> {
  return apiFetch<CartResponse>(`/cart/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function clearCart(): Promise<CartResponse> {
  return apiFetch<CartResponse>("/cart", {
    method: "DELETE",
  });
}
