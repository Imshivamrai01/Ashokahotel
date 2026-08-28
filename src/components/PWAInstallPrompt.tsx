"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Sparkles, ShieldCheck } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STAFF_ROUTES = [
  "/login",
  "/admin",
  "/captain",
  "/kitchen",
  "/cashier",
  "/inventory",
  "/leads",
];

export default function PWAInstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isStaff = STAFF_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if user already dismissed this session
    if (sessionStorage.getItem(`pwa-dismissed-${isStaff ? "staff" : "menu"}`)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isStaff]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(`pwa-dismissed-${isStaff ? "staff" : "menu"}`, "1");
  };

  if (dismissed || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:bottom-5 z-50 max-w-sm pointer-events-auto"
      >
        <div
          className="rounded-2xl shadow-xl p-4 flex items-center gap-3 backdrop-blur-md bg-white/95 border border-amber-300/80"
          style={{
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div
            className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold bg-amber-50 border border-amber-200 text-amber-700"
          >
            {isStaff ? <ShieldCheck className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-slate-900 truncate">
              {isStaff ? "Install Ashoka Staff POS" : "Install Ashoka Menu App"}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
              {isStaff
                ? "Fast offline POS, Captain & Kitchen app"
                : "Fast digital menu & ordering on home screen"}
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="shrink-0 btn btn-sm border-none gap-1.5 font-bold cursor-pointer bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="shrink-0 btn btn-ghost btn-xs btn-circle text-slate-400 hover:text-slate-700"
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
