import { apiFetch } from "./client";
import { Product } from "./products";

export type Wishlist = {
  _id: string;
  user: string;
  products: Product[];
};

export type WishlistResponse = {
  wishlist: Wishlist;
  message?: string;
};

export async function getWishlist(): Promise<WishlistResponse> {
  return apiFetch<WishlistResponse>("/wishlist");
}

export async function addToWishlist(productId: string): Promise<WishlistResponse> {
  return apiFetch<WishlistResponse>("/wishlist/items", {
    method: "POST",
    body: { productId },
  });
}

export async function removeFromWishlist(productId: string): Promise<WishlistResponse> {
  return apiFetch<WishlistResponse>(`/wishlist/items/${productId}`, {
    method: "DELETE",
  });
}

export async function clearWishlist(): Promise<WishlistResponse> {
  return apiFetch<WishlistResponse>("/wishlist", {
    method: "DELETE",
  });
}
