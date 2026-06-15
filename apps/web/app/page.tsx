"use client";

import { useEffect, useState } from "react";

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
      <div style={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Agent Hooks</h1>
      <p style={styles.subtitle}>Authentication</p>

      {user ? (
        <div style={styles.card}>
          <p style={styles.welcome}>Welcome, {user.name}!</p>
          <p style={styles.email}>{user.email}</p>
          <div style={styles.links}>
            <a href="/dashboard" style={styles.button}>Go to Dashboard</a>
          </div>
        </div>
      ) : (
        <div style={styles.links}>
          <a href="/login" style={styles.button}>Login</a>
          <a href="/register" style={{ ...styles.button, ...styles.buttonSecondary }}>
            Register
          </a>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "20px",
    textAlign: "center",
  },
  title: {
    fontSize: "2.5rem",
    margin: "0 0 8px",
    fontWeight: 700,
  },
  subtitle: {
    fontSize: "1rem",
    color: "#666",
    marginBottom: "32px",
  },
  card: {
    background: "#f5f5f5",
    borderRadius: "12px",
    padding: "24px",
    maxWidth: "400px",
    width: "100%",
  },
  welcome: {
    fontSize: "1.2rem",
    fontWeight: 600,
    margin: "0 0 4px",
  },
  email: {
    fontSize: "0.9rem",
    color: "#666",
    margin: "0 0 20px",
  },
  links: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  button: {
    display: "inline-block",
    padding: "12px 24px",
    background: "#000",
    color: "#fff",
    textDecoration: "none",
    borderRadius: "8px",
    fontWeight: 500,
    fontSize: "1rem",
  },
  buttonSecondary: {
    background: "#e0e0e0",
    color: "#000",
  },
};