export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface ApiError {
  error: string;
  message: string;
}

interface AuthResponse {
  user: User;
  message?: string;
}

// If NEXT_PUBLIC_API_URL is set, use it as base; otherwise fall back to relative URLs (Next.js rewrites)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as ApiError).message || "Something went wrong");
  }

  return data as T;
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshToken(): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/refresh", {
    method: "POST",
  });
}

export async function logout(): Promise<void> {
  await request<{ message: string }>("/api/auth/logout", {
    method: "POST",
  });
}

export async function getMe(): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/me");
}

// ─── Endpoints ───────────────────────────────────────────

export interface Endpoint {
  _id: string;
  userId: string;
  description: string;
  method: string;
  endpoint: string;
  template: string;
  parameters: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExecuteResult {
  html: string;
  css: string;
  data: unknown;
}

export async function listEndpoints(): Promise<Endpoint[]> {
  return request<Endpoint[]>("/api/endpoints");
}

export async function createEndpoint(data: {
  description: string;
  method: string;
  endpoint: string;
  template?: string;
}): Promise<Endpoint> {
  return request<Endpoint>("/api/endpoints", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteEndpoint(id: string): Promise<void> {
  await request<{ message: string }>(`/api/endpoints/${id}`, {
    method: "DELETE",
  });
}

export async function executeEndpoint(
  id: string,
  params?: Record<string, string>
): Promise<ExecuteResult> {
  return request<ExecuteResult>(`/api/endpoints/${id}/execute`, {
    method: "POST",
    body: JSON.stringify(params || {}),
  });
}
