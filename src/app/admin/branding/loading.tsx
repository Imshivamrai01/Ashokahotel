import { CardSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-10 w-48 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
