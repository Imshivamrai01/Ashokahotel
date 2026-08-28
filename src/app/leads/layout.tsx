import ReactQueryProvider from "@/components/ReactQueryProvider";

export default function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>;
}
