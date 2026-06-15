import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}