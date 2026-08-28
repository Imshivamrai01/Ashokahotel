import { StatCardsSkeleton, TableSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-base-300 rounded w-48 animate-pulse" />
      <StatCardsSkeleton count={6} />
      <div className="h-64 bg-base-200 rounded-2xl animate-pulse" />
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}
