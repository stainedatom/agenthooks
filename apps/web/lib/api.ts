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
  refreshTokenExpiresIn?: number;
  message?: string;
}

// If NEXT_PUBLIC_API_URL is set, use it as base; otherwise fall back to relative URLs (Next.js rewrites)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export async function forceLogout(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("refresh_token_expires_at");
  }
  try {
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore error
  }
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

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
    const isAuthError = res.status === 401 || res.status === 403;
    const isRefreshRequest = url.includes("/api/auth/refresh");

    if (isAuthError && !isRefreshRequest) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData && typeof refreshData === "object" && "refreshTokenExpiresIn" in refreshData) {
            if (typeof window !== "undefined") {
              const expiresAt = Date.now() + (refreshData.refreshTokenExpiresIn as number);
              localStorage.setItem("refresh_token_expires_at", expiresAt.toString());
            }
          }

          // Retry the original request
          const retryRes = await fetch(`${BASE_URL}${url}`, {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            ...options,
          });

          if (retryRes.ok) {
            return retryRes.json() as Promise<T>;
          }

          const retryData = await retryRes.json();
          throw new Error((retryData as ApiError).message || "Something went wrong");
        } else {
          // Silent refresh failed (expired or invalid refresh token)
          await forceLogout();
          throw new Error("Session expired. Logging out.");
        }
      } catch (err) {
        if (err instanceof Error && err.message === "Session expired. Logging out.") {
          throw err;
        }
        await forceLogout();
        throw new Error("Session expired. Logging out.");
      }
    }

    throw new Error((data as ApiError).message || "Something went wrong");
  }

  // If request succeeded, check if it returned token expiration info
  if (data && typeof data === "object" && "refreshTokenExpiresIn" in data) {
    if (typeof window !== "undefined") {
      const expiresAt = Date.now() + (data.refreshTokenExpiresIn as number);
      localStorage.setItem("refresh_token_expires_at", expiresAt.toString());
    }
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
  if (typeof window !== "undefined") {
    localStorage.removeItem("refresh_token_expires_at");
  }
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
  endpoint?: string;
  template?: string;
  parameters?: Record<string, unknown>;
  scriptType?: "none" | "javascript" | "jsonata" | "jsonlogic";
  scriptCode?: string;
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
  endpoint?: string;
  template?: string;
  scriptType?: "none" | "javascript" | "jsonata" | "jsonlogic";
  scriptCode?: string;
}): Promise<Endpoint> {
  return request<Endpoint>("/api/endpoints", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEndpoint(
  id: string,
  data: {
    description: string;
    method: string;
    endpoint?: string;
    template?: string;
    scriptType?: "none" | "javascript" | "jsonata" | "jsonlogic";
    scriptCode?: string;
  }
): Promise<Endpoint> {
  return request<Endpoint>(`/api/endpoints/${id}`, {
    method: "PUT",
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
