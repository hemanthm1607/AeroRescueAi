import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AeroAiRescue — AI-Powered Flood Rescue Platform",
  description:
    "Real-time AI flood rescue and disaster response platform. Analyze flood scenes, detect survivors, assess hazards, and coordinate rescue operations.",
  keywords: [
    "flood rescue",
    "disaster response",
    "AI analysis",
    "emergency management",
    "drone surveillance",
  ],
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
