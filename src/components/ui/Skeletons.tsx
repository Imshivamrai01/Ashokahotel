interface Props {
  rows?: number;
  cols?: number;
  className?: string;
}

// Deterministic widths to avoid SSR/client hydration mismatch
const SKELETON_WIDTHS = [72, 85, 65, 90, 78, 68, 82, 75, 88, 70];

function skeletonWidth(row: number, col: number): string {
  return `${SKELETON_WIDTHS[(row * 3 + col) % SKELETON_WIDTHS.length]}%`;
}

export function TableSkeleton({ rows = 6, cols = 5 }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-base-300 animate-pulse">
      <table className="table table-sm w-full">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <div className="h-3 bg-base-300 rounded w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <div
                    className="h-3 bg-base-300 rounded"
                    style={{ width: skeletonWidth(r, c) }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ className = "" }: Props) {
  return (
    <div
      className={`bg-base-100 rounded-2xl border border-base-300 p-5 animate-pulse ${className}`}
    >
      <div className="h-4 bg-base-300 rounded w-1/3 mb-3" />
      <div className="h-8 bg-base-300 rounded w-1/2 mb-2" />
      <div className="h-3 bg-base-300 rounded w-2/3" />
    </div>
  );
}

export function StatCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
