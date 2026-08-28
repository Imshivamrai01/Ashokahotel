"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STAFF_ROUTES = [
  "/login",
  "/admin",
  "/captain",
  "/kitchen",
  "/cashier",
  "/inventory",
  "/leads",
];

export default function PWAManifestManager() {
  const pathname = usePathname();

  useEffect(() => {
    const isStaff = STAFF_ROUTES.some((route) => pathname.startsWith(route));
    const targetManifest = isStaff ? "/manifest-admin.json" : "/manifest.json";
    const appTitle = isStaff ? "Ashoka Staff POS" : "Ashoka Digital Menu";

    // Update or create <link rel="manifest">
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }

    if (manifestLink.getAttribute("href") !== targetManifest) {
      manifestLink.setAttribute("href", targetManifest);
    }

    // Update Apple Mobile Web App Title
    let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    if (!appleTitle) {
      appleTitle = document.createElement("meta");
      appleTitle.name = "apple-mobile-web-app-title";
      document.head.appendChild(appleTitle);
    }
    appleTitle.content = appTitle;
  }, [pathname]);

  return null;
}
