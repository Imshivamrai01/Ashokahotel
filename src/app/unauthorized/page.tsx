import Link from "next/link";
import { ShieldOff } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-error/10 border border-error/20 mb-6">
          <ShieldOff className="w-10 h-10 text-error" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-base-content/50 mb-8">
          You don&apos;t have permission to view this page.
        </p>
        <Link href="/login" className="btn btn-primary">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
