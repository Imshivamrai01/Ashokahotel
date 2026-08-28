import { StatCardsSkeleton, TableSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-base-300 rounded w-48 animate-pulse" />
      <StatCardsSkeleton count={8} />
      <TableSkeleton rows={8} cols={8} />
    </div>
  );
}
