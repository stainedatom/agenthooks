"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        // Not authenticated
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center font-sans antialiased">
      <h1 className="text-4xl font-bold mb-2">Agent Hooks</h1>
      <p className="text-base text-gray-500 mb-8">Authentication</p>

      {user ? (
        <div className="bg-gray-100 rounded-xl p-6 max-w-md w-full">
          <p className="text-lg font-semibold mb-1">Welcome, {user.name}!</p>
          <p className="text-sm text-gray-500 mb-5">{user.email}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-black text-white rounded-lg font-medium text-base no-underline"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-black text-white rounded-lg font-medium text-base no-underline"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-block px-6 py-3 bg-gray-200 text-black rounded-lg font-medium text-base no-underline"
          >
            Register
          </Link>
        </div>
      )}
    </div>
  );
}