"use client";

import ReactQueryProvider from "@/components/ReactQueryProvider";
import { Toaster } from "sonner";

export default function AdminProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReactQueryProvider>
      {children}
      <Toaster position="bottom-right" richColors />
    </ReactQueryProvider>
  );
}
