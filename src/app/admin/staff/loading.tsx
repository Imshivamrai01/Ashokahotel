import { TableSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-base-300 rounded w-48 animate-pulse" />
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
