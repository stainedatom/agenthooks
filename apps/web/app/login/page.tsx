"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const data = await login(email, password);
      setUser(data.user);
      // Notify the auth context to schedule a session check before the access token expires
      if (data.accessTokenExpiresAt && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:session-setup", {
          detail: { accessTokenExpiresAt: data.accessTokenExpiresAt },
        }));
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-5">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-sm">
        <h1 className="text-2xl font-bold m-0 mb-1">Sign In</h1>
        <p className="text-sm text-gray-500 m-0 mb-6">Welcome back</p>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-base outline-none focus:border-gray-400 transition-colors"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-base outline-none focus:border-gray-400 transition-colors"
              placeholder="Your password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="py-3 bg-black text-white rounded-lg text-base font-medium cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-5 text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-black font-semibold underline">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}