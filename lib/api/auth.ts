import { apiFetch } from "./client";

export type User = {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  message: string;
  user: User;
};

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: data,
  });
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: data,
  });
}

export async function googleLogin(credential: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/google", {
    method: "POST",
    body: { credential },
  });
}

export async function getCurrentUser(): Promise<{ user: User }> {
  return apiFetch<{ user: User }>("/auth/me");
}

export async function logoutUser(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}