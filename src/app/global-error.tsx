"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
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
      </body>
    </html>
  );
}
