import type { Metadata } from "next";
import { YokaiPointShop } from "@/components/shop/yokai-point-shop";
import { getCurrentUser } from "@/lib/current-user";
import { getMarkCatalog } from "@/lib/marks";
import type { MarkCatalog } from "@/lib/mark-categories";

// 내용이 거의 없는 화면이라 검색에서 뺌(애드센스 품질 평가)
export const metadata: Metadata = { title: "마크 상점", robots: { index: false, follow: true } };

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
