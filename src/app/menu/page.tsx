import { headers } from "next/headers";
import { getBranding, getMenuData, getLocationByCode } from "@/lib/queries";
import { isMobileUserAgent, chunkArray } from "@/lib/utils";
import MenuShell from "@/components/menu/MenuShell";
import type { CategoryWithItems, MenuViewMode, MenuMode } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  searchParams: Promise<{ type?: string; location?: string }>;
}

export default async function MenuPage({ searchParams }: Props) {
  const params = await searchParams;
  const locationType = (
    params.type === "room" ? "room" : params.type === "table" ? "table" : "none"
  ) as MenuMode;
  const locationCode = params.location ?? null;

  const [branding, menuData, location] = await Promise.all([
    getBranding(),
    getMenuData(),
    locationCode ? getLocationByCode(locationCode) : Promise.resolve(null),
  ]);

  // Build CategoryWithItems[]
  const categoriesWithItems: CategoryWithItems[] = menuData.categories
    .filter((c) => (menuData.itemsByCategory[c._id]?.length ?? 0) > 0)
    .map((c) => ({
      ...c,
      items: menuData.itemsByCategory[c._id] ?? [],
    }));

  // Device detection
  const headersList = await headers();
  const ua = headersList.get("user-agent") ?? "";
  const viewMode: MenuViewMode = isMobileUserAgent(ua) ? "mobile" : "tablet";

  // Pre-generate flipbook pages for tablet
  const flipbookPages = generateFlipbookPageData(categoriesWithItems);

  // Serialize to strip Mongoose ObjectId instances before passing to Client Components
  const s = <T,>(d: T): T => JSON.parse(JSON.stringify(d));

  return (
    <MenuShell
      branding={s(branding)}
      categoriesWithItems={s(categoriesWithItems)}
      flipbookPages={s(flipbookPages)}
      location={s(location)}
      locationType={locationType}
      locationCode={locationCode}
      viewMode={viewMode}
    />
  );
}

// ─── Flipbook Page Data Generator ────────────────────────────────────────────

export type FlipbookPageData =
  | { type: "cover_left" }
  | { type: "cover" }
  | { type: "index"; categories: CategoryWithItems[] }
  | {
      type: "menu";
      category: CategoryWithItems;
      items: CategoryWithItems["items"];
      chunkIndex: number;
      totalChunks: number;
    }
  | { type: "blank" }
  | { type: "back_cover" };

export function generateFlipbookPageData(
  cats: CategoryWithItems[],
): FlipbookPageData[] {
  // cover_left + cover = full-width spread (page 0 left, page 1 right)
  const pages: FlipbookPageData[] = [
    { type: "cover_left" },
    { type: "cover" },
    { type: "index", categories: cats },
  ];

  for (const cat of cats) {
    const chunks = chunkArray(cat.items, 4);
    chunks.forEach((items, i) =>
      pages.push({
        type: "menu",
        category: cat,
        items,
        chunkIndex: i,
        totalChunks: chunks.length,
      }),
    );
  }

  // back_cover should sit on the RIGHT page of the final spread (odd index).
  // When pages.length is ODD (e.g. 41 items, indices 0..40), index 40 is on the LEFT.
  // Pushing back_cover directly puts it at index 41 on the RIGHT of the last category!
  // Only when pages.length is EVEN (e.g. 40), we push a filler page so back_cover stays on the right.
  if (pages.length % 2 === 0) pages.push({ type: "blank" });
  pages.push({ type: "back_cover" });

  return pages;
}
