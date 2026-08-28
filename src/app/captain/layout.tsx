import type { ReactNode } from "react";
import ReactQueryProvider from "@/components/ReactQueryProvider";

// Auth is handled by middleware.ts — this layout just wraps the captain shell.
// /captain/login is exempted from auth in middleware (LOGIN_PAGES).
export default function CaptainLayout({ children }: { children: ReactNode }) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>;
}
