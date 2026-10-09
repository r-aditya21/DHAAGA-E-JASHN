import { apiFetch } from "./client";

export type Category = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function getCategories(): Promise<{ categories: Category[] }> {
  return apiFetch<{ categories: Category[] }>("/categories");
}

export async function getCategoryBySlug(slug: string): Promise<{ category: Category }> {
  return apiFetch<{ category: Category }>(`/categories/${slug}`);
}
