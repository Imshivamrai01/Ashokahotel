"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[Admin Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <AlertTriangle className="w-16 h-16 text-error" />
      <div>
        <h2 className="text-2xl font-bold text-error mb-2">
          Something went wrong
        </h2>
        <p className="text-base-content/60 max-w-md">
          {error.message || "An unexpected error occurred in the admin panel."}
        </p>
        {error.digest && (
          <p className="text-xs text-base-content/40 mt-2 font-mono">
            Digest: {error.digest}
          </p>
        )}
      </div>
      <button className="btn btn-error btn-outline" onClick={reset}>
        Try Again
      </button>
    </div>
  );
}
