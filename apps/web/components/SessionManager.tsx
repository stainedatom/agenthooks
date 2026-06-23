"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { forceLogout } from "../lib/api";

const PUBLIC_ROUTES = ["/", "/login", "/register"];

export default function SessionManager() {
  const pathname = usePathname();

  useEffect(() => {
    // If the user is on a public route, do not run the idle logout checker
    if (PUBLIC_ROUTES.includes(pathname)) {
      return;
    }

    const interval = setInterval(() => {
      const expiresAtStr = localStorage.getItem("refresh_token_expires_at");
      if (expiresAtStr) {
        const expiresAt = parseInt(expiresAtStr, 10);
        if (Date.now() >= expiresAt) {
          clearInterval(interval);
          forceLogout();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
