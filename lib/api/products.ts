import { apiFetch } from "./client";
import { Category } from "./categories";

export type ProductVariant = {
  _id?: string;
  size: string;
  color: string;
  stock: number;
};

export type Gender = "men" | "women" | "unisex";

export type Product = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  category: string | Category;
  variants: ProductVariant[];
  gender?: Gender;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type ProductsResponse = {
  products: Product[];
  pagination: PaginationMeta;
};

export async function getProducts(params?: {
  category?: string;
  gender?: "men" | "women";
  q?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  page?: number;
  limit?: number;
}): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.category && params.category !== "all") {
    searchParams.set("category", params.category);
  }

  if (params?.gender) {
    searchParams.set("gender", params.gender);
  }

  const query = params?.q || params?.search;
  if (query) {
    searchParams.set("q", query);
  }

  if (params?.minPrice !== undefined) {
    searchParams.set("minPrice", String(params.minPrice));
  }

  if (params?.maxPrice !== undefined) {
    searchParams.set("maxPrice", String(params.maxPrice));
  }

  if (params?.sort) {
    searchParams.set("sort", params.sort);
  }

  if (params?.page) {
    searchParams.set("page", String(params.page));
  }

  if (params?.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const qs = searchParams.toString();
  return apiFetch<ProductsResponse>(`/products${qs ? `?${qs}` : ""}`);
}

export async function getProductBySlug(slug: string): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>(`/products/${slug}`);
}