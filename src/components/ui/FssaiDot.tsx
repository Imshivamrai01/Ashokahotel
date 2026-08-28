/**
 * FSSAI-compliant food type indicator
 * Veg   : green square border + green filled circle (FSSAI standard)
 * Non-Veg: brown/maroon square border + brown filled downward triangle
 */

interface FssaiDotProps {
  isVeg: boolean;
  /** "sm" = 12px (table/list), "md" = 16px (card), "lg" = 20px (menu) */
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const SIZES = {
  sm: { outer: 12, inner: 5 },
  md: { outer: 16, inner: 7 },
  lg: { outer: 20, inner: 9 },
};

export function FssaiDot({
  isVeg,
  size = "sm",
  showLabel = false,
}: FssaiDotProps) {
  const { outer, inner } = SIZES[size];
  const color = isVeg ? "#16a34a" : "#92400e"; // green-700 / amber-900 (FSSAI brown)

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <svg
        width={outer}
        height={outer}
        viewBox={`0 0 ${outer} ${outer}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={isVeg ? "Vegetarian" : "Non-Vegetarian"}
      >
        {/* Square border */}
        <rect
          x="1"
          y="1"
          width={outer - 2}
          height={outer - 2}
          rx="1"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
        />
        {isVeg ? (
          /* Veg: filled circle */
          <circle cx={outer / 2} cy={outer / 2} r={inner / 2} fill={color} />
        ) : (
          /* Non-veg: filled downward-pointing triangle */
          <polygon
            points={`${outer / 2},${outer / 2 + inner / 2} ${outer / 2 - inner / 2},${outer / 2 - inner / 2 + 1} ${outer / 2 + inner / 2},${outer / 2 - inner / 2 + 1}`}
            fill={color}
          />
        )}
      </svg>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color }}>
          {isVeg ? "Veg" : "Non-Veg"}
        </span>
      )}
    </span>
  );
}
