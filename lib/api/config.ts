import { apiFetch } from "./client";

export type StoreConfig = {
  freeShippingThreshold: number;
  shippingFee: number;
};

export async function getStoreConfig(): Promise<StoreConfig> {
  return apiFetch<StoreConfig>("/config");
}
