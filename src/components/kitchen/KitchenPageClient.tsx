"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { signOut } from "next-auth/react";
import { LogOut, Flame } from "lucide-react";
import KDSBoard from "./KDSBoard";

const queryClient = new QueryClient();

interface KitchenPageClientProps {
  staffName: string;
}

export default function KitchenPageClient({
  staffName,
}: KitchenPageClientProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-screen bg-base-100 overflow-hidden">
        {/* Top nav */}
        <header className="flex items-center justify-between px-4 py-2 bg-error/10 border-b border-error/20 shrink-0">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-error" />
            <span className="font-bold text-error">Kitchen</span>
            <span className="text-base-content/50 text-sm">· {staffName}</span>
          </div>
          <button
            onClick={() =>
              signOut({ redirect: false }).then(() => {
                window.location.replace("/kitchen/login");
              })
            }
            className="btn btn-ghost btn-xs gap-1.5 text-base-content/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </header>

        {/* Main KDS */}
        <div className="flex-1 overflow-hidden">
          <KDSBoard />
        </div>
      </div>
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}
