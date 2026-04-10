import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bu Haftanın Açık Pencereleri — Swissotel The Bosphorus",
  description: "Swissotel The Bosphorus için haftalık pazarlama fırsat istihbaratı",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full">
      <body className={`${inter.variable} font-sans min-h-full antialiased`}>{children}</body>
    </html>
  );
}
