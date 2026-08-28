import { StatCardsSkeleton, TableSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <StatCardsSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="skeleton h-64 w-full rounded-xl" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
