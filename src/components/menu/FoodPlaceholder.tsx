import Image from "next/image";

/**
 * Fallback shown when a menu item has no photo — the restaurant logo,
 * faded and contained, instead of a generic icon.
 *
 * Rendered as `absolute inset-0` so it takes concrete dimensions from its
 * positioned parent (the aspect-ratio media box). A percentage-height inner
 * box would collapse to 0 and trip next/image's "fill with height 0" warning.
 */
export default function FoodPlaceholder({
  logoUrl,
  className = "",
}: {
  logoUrl?: string | null;
  className?: string;
}) {
  const src = logoUrl || "/tajlogo.png";
  return (
    <div className={`absolute inset-0 p-[18%] ${className}`} aria-hidden="true">
      <div className="relative w-full h-full opacity-25">
        <Image src={src} alt="" fill sizes="200px" className="object-contain" />
      </div>
    </div>
  );
}
