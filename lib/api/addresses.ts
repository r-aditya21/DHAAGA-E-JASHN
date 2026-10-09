import { apiFetch } from "./client";

export type Address = {
  _id: string;
  user: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AddressInput = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  isDefault?: boolean;
};

export async function getAddresses(): Promise<{ addresses: Address[] }> {
  return apiFetch<{ addresses: Address[] }>("/addresses");
}

export async function createAddress(data: AddressInput): Promise<{
  message: string;
  address: Address;
}> {
  return apiFetch<{ message: string; address: Address }>("/addresses", {
    method: "POST",
    body: data,
  });
}

export async function updateAddress(
  id: string,
  data: Partial<AddressInput>
): Promise<{ message: string; address: Address }> {
  return apiFetch<{ message: string; address: Address }>(`/addresses/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteAddress(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/addresses/${id}`, {
    method: "DELETE",
  });
}
