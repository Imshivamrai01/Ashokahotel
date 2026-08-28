"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

const RELOAD_KEY = "chunk-reload-attempted";
const CHUNK_ERROR_RE =
  /ChunkLoadError|Loading chunk [\w./-]+ failed|Failed to load chunk|error loading dynamically imported module|Importing a module script failed/i;

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.name === "ChunkLoadError" ||
    CHUNK_ERROR_RE.test(error?.message ?? "");

  useEffect(() => {
    if (!isChunkError) {
      console.error(error);
      return;
    }
    // Stale chunk (usually a redeployed PWA). Purge caches + reload once.
    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(RELOAD_KEY) === "1";
      sessionStorage.setItem(RELOAD_KEY, "1");
    } catch {
      /* ignore */
    }
    if (alreadyTried) return;
    (async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* ignore */
      }
      window.location.reload();
    })();
  }, [isChunkError, error]);

  // While a chunk-error reload is in flight, show a neutral "updating" state.
  if (isChunkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
        <div className="text-center max-w-sm flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-base-content/60 text-sm">Updating to the latest version…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="p-5 rounded-full bg-error/10">
            <AlertTriangle className="w-12 h-12 text-error" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-base-content/50 text-sm mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <button onClick={reset} className="btn btn-primary gap-2">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    </div>
  );
}
