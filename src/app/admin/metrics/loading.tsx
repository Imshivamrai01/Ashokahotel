export default function MetricsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-base-300 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-20 bg-base-200 border border-base-300 rounded-2xl"
          />
        ))}
      </div>
      <div className="h-56 bg-base-200 border border-base-300 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-64 bg-base-200 border border-base-300 rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}
