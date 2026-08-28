import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getBranding, getMenuData, getLocationByCode } from "@/lib/queries";
import { isMobileUserAgent } from "@/lib/utils";
import MenuShell from "@/components/menu/MenuShell";
import type { CategoryWithItems, MenuViewMode } from "@/types";
import { generateFlipbookPageData } from "@/app/menu/page";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function MenuByCodePage({ params }: Props) {
  const { code } = await params;

  const [branding, menuData, location] = await Promise.all([
    getBranding(),
    getMenuData(),
    getLocationByCode(code),
  ]);

  // Unknown / inactive location → 404
  if (!location) notFound();

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

  const flipbookPages = generateFlipbookPageData(categoriesWithItems);

  // Serialize to strip Mongoose ObjectId instances before passing to Client Components
  const s = <T,>(d: T): T => JSON.parse(JSON.stringify(d));

  return (
    <MenuShell
      branding={s(branding)}
      categoriesWithItems={s(categoriesWithItems)}
      flipbookPages={s(flipbookPages)}
      location={s(location)}
      locationType={location.type}
      locationCode={code}
      viewMode={viewMode}
    />
  );
}
