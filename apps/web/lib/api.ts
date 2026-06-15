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