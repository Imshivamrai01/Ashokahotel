"use client";

import { useEffect } from "react";

/**
 * Recovers from `ChunkLoadError` — a stale page (often served by the PWA
 * service worker after a redeploy) references a hashed JS chunk that no longer
 * exists. We purge the caches and reload once. A sessionStorage guard prevents
 * an infinite reload loop if the error is genuinely unrecoverable.
 */
const RELOAD_KEY = "chunk-reload-attempted";

const CHUNK_ERROR_RE =
  /ChunkLoadError|Loading chunk [\w./-]+ failed|Failed to load chunk|error loading dynamically imported module|Importing a module script failed/i;

export default function ChunkErrorReload() {
  useEffect(() => {
    // If we mounted successfully, a prior recovery worked — reset the guard
    // shortly after so a future (unrelated) chunk error can retry.
    const reset = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        /* ignore */
      }
    }, 5000);

    const recover = async (message?: string) => {
      if (!message || !CHUNK_ERROR_RE.test(message)) return;

      let alreadyTried = false;
      try {
        alreadyTried = sessionStorage.getItem(RELOAD_KEY) === "1";
        sessionStorage.setItem(RELOAD_KEY, "1");
      } catch {
        /* sessionStorage unavailable — fall through, reload once */
      }
      if (alreadyTried) return; // avoid reload loop

      // Drop SW caches so the reload fetches fresh chunks from the network.
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* ignore */
      }
      window.location.reload();
    };

    const onError = (e: ErrorEvent) =>
      void recover(e?.message || e?.error?.message);
    const onRejection = (e: PromiseRejectionEvent) =>
      void recover(e?.reason?.message ?? String(e?.reason ?? ""));

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.clearTimeout(reset);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
