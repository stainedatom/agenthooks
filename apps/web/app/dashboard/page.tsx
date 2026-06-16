"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, logout, User } from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await getMe();
        setUser(data.user);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  async function handleLogout() {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-5 bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-5 bg-gray-50 font-sans antialiased">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold m-0">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-100 text-red-700 border-none rounded-md text-sm font-medium cursor-pointer hover:bg-red-200 transition-colors"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg mb-6">
          <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-lg font-semibold shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold m-0 mb-0.5">{user.name}</p>
            <p className="text-sm text-gray-500 m-0 mb-1">{user.email}</p>
            <p className="text-xs text-gray-400 m-0">
              User ID: {user.id}
              {user.createdAt && ` | Joined: ${new Date(user.createdAt).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-base font-semibold m-0 mb-3">Authentication Status</h2>
          <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
            <span className="text-sm text-gray-700">Access Token</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-200 text-gray-700 font-medium">
              httpOnly Cookie
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
            <span className="text-sm text-gray-700">Refresh Token</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-200 text-gray-700 font-medium">
              httpOnly Cookie
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
            <span className="text-sm text-gray-700">Authentication</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-medium">
              Active
            </span>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-gray-500 text-sm underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}