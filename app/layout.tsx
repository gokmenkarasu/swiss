import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gap Finder — Swissotel Intelligence",
  description: "Real-time marketing opportunity detection for Swissotel The Bosphorus",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
