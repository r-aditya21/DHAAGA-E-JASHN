import { apiFetch } from "./client";
import { PaginationMeta } from "./products";

export type Review = {
  _id: string;
  user: { _id: string; name: string; email?: string } | string;
  product: { _id: string; name: string; slug: string; images?: string[] } | string;
  order: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductReviewsResponse = {
  reviews: Review[];
  summary: {
    count: number;
    averageRating: number;
  };
  pagination: PaginationMeta;
};

export async function getProductReviews(
  productId: string,
  page = 1,
  limit = 10
): Promise<ProductReviewsResponse> {
  return apiFetch<ProductReviewsResponse>(
    `/reviews/product/${productId}?page=${page}&limit=${limit}`
  );
}

export async function getMyReviews(): Promise<{ reviews: Review[] }> {
  return apiFetch<{ reviews: Review[] }>("/reviews/my");
}

export async function createReview(data: {
  productId: string;
  orderId: string;
  rating: number;
  comment: string;
}): Promise<{ message: string; review: Review }> {
  return apiFetch<{ message: string; review: Review }>("/reviews", {
    method: "POST",
    body: data,
  });
}

export async function updateReview(
  id: string,
  data: { rating?: number; comment?: string }
): Promise<{ message: string; review: Review }> {
  return apiFetch<{ message: string; review: Review }>(`/reviews/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteReview(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/reviews/${id}`, {
    method: "DELETE",
  });
}
