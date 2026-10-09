import { apiFetch } from "./client";
import { Product, PaginationMeta } from "./products";
import { Category } from "./categories";
import { Order } from "./orders";
import { Review } from "./reviews";
import { User } from "./auth";

export type AdminCategory = Category & { productCount: number };

export type OrderStatus = Order["orderStatus"];

export type DashboardStats = {
  totalUsers: number;
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  totalReviews: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
};

export type SalesDay = { date: string; orders: number; revenue: number };

export type TopProduct = {
  productId: string;
  name: string;
  units: number;
  revenue: number;
};

export type LowStockRow = {
  productId: string;
  name: string;
  slug: string;
  size: string;
  color: string;
  stock: number;
};

export type DashboardResponse = {
  stats: DashboardStats;
  ordersByStatus: Record<OrderStatus, number>;
  salesByDay: SalesDay[];
  topProducts: TopProduct[];
  lowStock: LowStockRow[];
  lowStockThreshold: number;
};

export async function getDashboardStats(): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>("/admin/dashboard");
}

export async function getRecentOrders(): Promise<{ orders: Order[] }> {
  return apiFetch<{ orders: Order[] }>("/admin/recent-orders");
}

export async function getAdminProducts(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: "active" | "inactive";
}): Promise<{ products: Product[]; pagination: PaginationMeta }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.q) sp.set("q", params.q);
  if (params?.status) sp.set("status", params.status);
  const qs = sp.toString();
  return apiFetch<{ products: Product[]; pagination: PaginationMeta }>(
    `/admin/products${qs ? `?${qs}` : ""}`
  );
}

export async function getAdminProductById(
  id: string
): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>(`/admin/products/${id}`);
}

export async function createProduct(data: {
  name: string;
  slug?: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  variants: { size: string; color: string; stock: number }[];
  isActive?: boolean;
}): Promise<{ message: string; product: Product }> {
  return apiFetch<{ message: string; product: Product }>("/products", {
    method: "POST",
    body: data,
  });
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    price: number;
    images: string[];
    category: string;
    variants: { size: string; color: string; stock: number }[];
    isActive: boolean;
  }>
): Promise<{ message: string; product: Product }> {
  return apiFetch<{ message: string; product: Product }>(`/products/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteProduct(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/products/${id}`, {
    method: "DELETE",
  });
}

export async function getAdminCategories(): Promise<{
  categories: AdminCategory[];
}> {
  return apiFetch<{ categories: AdminCategory[] }>("/admin/categories");
}

export async function createCategory(data: {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
}): Promise<{ message: string; category: Category }> {
  return apiFetch<{ message: string; category: Category }>("/categories", {
    method: "POST",
    body: data,
  });
}

export async function updateCategory(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    image: string;
    isActive: boolean;
  }>
): Promise<{ message: string; category: Category }> {
  return apiFetch<{ message: string; category: Category }>(
    `/categories/admin/${id}`,
    {
      method: "PUT",
      body: data,
    }
  );
}

export async function deleteCategory(
  id: string
): Promise<{ message: string; affectedProducts: number }> {
  return apiFetch<{ message: string; affectedProducts: number }>(`/categories/admin/${id}`, {
    method: "DELETE",
  });
}

export async function getAdminOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  q?: string;
}): Promise<{ orders: Order[]; pagination: PaginationMeta }> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.status) sp.set("status", params.status);
  if (params?.paymentStatus) sp.set("paymentStatus", params.paymentStatus);
  const qs = sp.toString();
  return apiFetch<{ orders: Order[]; pagination: PaginationMeta }>(
    `/orders/admin/all${qs ? `?${qs}` : ""}`
  );
}

export async function getAdminOrderById(id: string): Promise<{ order: Order }> {
  return apiFetch<{ order: Order }>(`/orders/admin/${id}`);
}

export async function updateOrderStatus(
  id: string,
  orderStatus: string
): Promise<{ message: string; order: Order }> {
  return apiFetch<{ message: string; order: Order }>(
    `/orders/admin/${id}/status`,
    {
      method: "PUT",
      body: { orderStatus },
    }
  );
}

export async function getAdminReviews(params?: {
  page?: number;
  limit?: number;
  approved?: boolean;
}): Promise<{ reviews: Review[]; pagination: PaginationMeta }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.approved !== undefined) sp.set("approved", String(params.approved));
  const qs = sp.toString();
  return apiFetch<{ reviews: Review[]; pagination: PaginationMeta }>(
    `/admin/reviews${qs ? `?${qs}` : ""}`
  );
}

export async function setReviewApproval(
  id: string,
  isApproved: boolean
): Promise<{ message: string; review: Review }> {
  return apiFetch<{ message: string; review: Review }>(
    `/admin/reviews/${id}/approval`,
    {
      method: "PUT",
      body: { isApproved },
    }
  );
}

export async function deleteAdminReview(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/reviews/${id}`, {
    method: "DELETE",
  });
}

export async function getAdminUsers(params?: {
  page?: number;
  limit?: number;
  q?: string;
  role?: "customer" | "admin";
}): Promise<{ users: AdminUser[]; pagination: PaginationMeta }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.q) sp.set("q", params.q);
  if (params?.role) sp.set("role", params.role);
  const qs = sp.toString();
  return apiFetch<{ users: AdminUser[]; pagination: PaginationMeta }>(
    `/users${qs ? `?${qs}` : ""}`
  );
}

export async function updateUserRole(
  id: string,
  role: "customer" | "admin"
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/users/${id}/role`, {
    method: "PUT",
    body: { role },
  });
}

export type AdminUser = Omit<User, "id"> & {
  _id: string;
  authProvider?: string;
  createdAt: string;
};
