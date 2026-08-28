import type { Metadata, Viewport } from "next";
import {
  Plus_Jakarta_Sans,
  Playfair_Display,
  JetBrains_Mono,
  Geist,
} from "next/font/google";
import "./globals.css";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAManifestManager from "@/components/PWAManifestManager";
import ChunkErrorReload from "@/components/ChunkErrorReload";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const viewport: Viewport = {
  themeColor: "#FAF9F6",
  width: "device-width",
  initialScale: 1,
  // Never disable zoom — WCAG 1.4.4 / iOS pinch-zoom accessibility.
  maximumScale: 5,
  userScalable: true,
};

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Ashoka Hotel — Luxury Dining & Room Service",
  description: "Scan & Order — Ashoka Hotel Digital Menu & Room Service",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ashoka Hotel",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        jakarta.variable,
        playfair.variable,
        jetbrains.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-[#FAF9F6] text-slate-900 selection:bg-amber-100 selection:text-amber-900"
      >
        <PWAManifestManager />
        <ChunkErrorReload />
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
