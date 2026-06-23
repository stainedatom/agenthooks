import type { Metadata } from "next";
import "./globals.css";
import SessionManager from "../components/SessionManager";

export const metadata: Metadata = {
  title: "Agent Hooks",
  description: "Authentication system with JWT httpOnly cookies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionManager />
        {children}
      </body>
    </html>
  );
}