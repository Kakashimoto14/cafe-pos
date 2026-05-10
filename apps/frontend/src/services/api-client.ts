import type { AuthUser, MenuProduct, OrderPayload } from "@cafe/shared-types";

type ApiEnvelope<T> = {
  data: T;
};

type PaginatedApiEnvelope<T> = {
  data: {
    data: T;
  } | T;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

type OrderResponse = {
  id: string;
  order_number: string;
  grand_total: number;
};

type ProductApiRecord = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url?: string;
  tags: string[];
  is_active: boolean;
};

const API_BASE = "/api/v1";

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Request failed.");
  }

  const json = (await response.json()) as ApiEnvelope<T>;
  return json.data;
}

export const apiClient = {
  login(payload: { email: string; password: string; device_name: string }) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  me(token: string) {
    return request<AuthUser>("/auth/me", {}, token);
  },
  logout(token: string) {
    return request<{ logged_out: boolean }>(
      "/auth/logout",
      {
        method: "POST"
      },
      token
    );
  },
  async products(token: string) {
    const response = await request<ProductApiRecord[] | { data: ProductApiRecord[] }>("/products", {}, token);

    const records = Array.isArray(response) ? response : response.data;

    return records.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      imageUrl: product.image_url,
      tags: product.tags,
      isActive: product.is_active
    }));
  },
  createOrder(payload: OrderPayload, token: string) {
    return request<OrderResponse>(
      "/orders",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    );
  }
};
