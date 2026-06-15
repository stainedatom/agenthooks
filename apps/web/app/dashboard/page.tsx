"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      <div style={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Dashboard</h1>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={styles.name}>{user.name}</p>
            <p style={styles.email}>{user.email}</p>
            <p style={styles.meta}>
              User ID: {user.id}
              {user.createdAt && ` | Joined: ${new Date(user.createdAt).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Authentication Status</h2>
          <div style={styles.statusRow}>
            <span style={styles.statusLabel}>Access Token</span>
            <span style={styles.statusBadge}>httpOnly Cookie</span>
          </div>
          <div style={styles.statusRow}>
            <span style={styles.statusLabel}>Refresh Token</span>
            <span style={styles.statusBadge}>httpOnly Cookie</span>
          </div>
          <div style={styles.statusRow}>
            <span style={styles.statusLabel}>Authentication</span>
            <span style={{ ...styles.statusBadge, background: "#d1fae5", color: "#065f46" }}>
              Active
            </span>
          </div>
        </div>

        <div style={styles.links}>
          <a href="/" style={styles.homeLink}>Back to Home</a>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "20px",
    background: "#f9fafb",
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "32px",
    maxWidth: "500px",
    width: "100%",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    margin: 0,
  },
  logoutButton: {
    padding: "8px 16px",
    background: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.9rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  error: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "0.9rem",
  },
  userInfo: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    padding: "16px",
    background: "#f9fafb",
    borderRadius: "8px",
    marginBottom: "24px",
  },
  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "#000",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
    fontWeight: 600,
    flexShrink: 0,
  },
  name: {
    fontSize: "1.1rem",
    fontWeight: 600,
    margin: "0 0 2px",
  },
  email: {
    fontSize: "0.9rem",
    color: "#666",
    margin: "0 0 4px",
  },
  meta: {
    fontSize: "0.8rem",
    color: "#999",
    margin: 0,
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    margin: "0 0 12px",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #f0f0f0",
  },
  statusLabel: {
    fontSize: "0.9rem",
    color: "#333",
  },
  statusBadge: {
    fontSize: "0.8rem",
    padding: "4px 10px",
    borderRadius: "20px",
    background: "#e0e0e0",
    color: "#333",
    fontWeight: 500,
  },
  links: {
    textAlign: "center",
  },
  homeLink: {
    color: "#666",
    fontSize: "0.9rem",
    textDecoration: "underline",
  },
};