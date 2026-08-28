import { TableSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-10 w-48 rounded-lg" />
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}
