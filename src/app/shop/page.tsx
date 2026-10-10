import type { Metadata } from "next";
import { YokaiPointShop } from "@/components/shop/yokai-point-shop";
import { getCurrentUser } from "@/lib/current-user";
import { getMarkCatalog } from "@/lib/marks";
import type { MarkCatalog } from "@/lib/mark-categories";

export const metadata: Metadata = { title: "마크 상점" };

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const user = await getCurrentUser().catch(() => null);
  let initial: MarkCatalog | null = null;
  try {
    initial = await getMarkCatalog(user?.id);
  } catch {
    initial = null;
  }
  return <YokaiPointShop initial={initial} nickname={user?.nickname ?? "POKA"} />;
}
