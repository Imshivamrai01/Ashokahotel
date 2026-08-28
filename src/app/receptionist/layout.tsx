import type { ReactNode } from "react";
import ReactQueryProvider from "@/components/ReactQueryProvider";

export const metadata = {
  title: "Receptionist Desk | Ashoka Hotel",
  description: "Ashoka Hotel Receptionist Operations Hub",
};

export default function ReceptionistLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>;
}
