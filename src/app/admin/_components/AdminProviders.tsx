"use client";

import ReactQueryProvider from "@/components/ReactQueryProvider";

export default function AdminProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>;
}
