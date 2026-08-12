import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getMe,
  listEndpoints,
  listCollections,
  logout as apiLogout,
  User,
  Endpoint,
  EndpointCollection,
} from "../../../lib/api";

export function useDashboardData() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [collections, setCollections] = useState<EndpointCollection[]>([]);
  const [error, setError] = useState("");

  const initData = useCallback(async () => {
    try {
      const userData = await getMe();
      setUser(userData.user);

      const [eps, cols] = await Promise.all([
        listEndpoints(),
        listCollections(),
      ]);

      setEndpoints(eps);
      setCollections(cols);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    initData();
  }, [initData]);

  const handleLogout = async () => {
    try {
      await apiLogout();
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong during logout");
    }
  };

  return {
    user,
    loading,
    endpoints,
    setEndpoints,
    collections,
    setCollections,
    error,
    setError,
    handleLogout,
  };
}
