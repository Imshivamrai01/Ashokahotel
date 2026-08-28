import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="p-5 rounded-full bg-base-300">
            <SearchX className="w-12 h-12 text-base-content/30" />
          </div>
        </div>
        <h1 className="text-5xl font-bold font-mono mb-2">404</h1>
        <p className="text-lg font-semibold mb-2">Page not found</p>
        <p className="text-base-content/50 text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn btn-primary gap-2">
          <Home className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    </div>
  );
}
