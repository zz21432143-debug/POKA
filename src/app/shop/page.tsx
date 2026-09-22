import { MarkShop } from "@/components/shop/mark-shop";
import { getCurrentUser } from "@/lib/current-user";
import { getMarkCatalog } from "@/lib/marks";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const user = await getCurrentUser().catch(() => null);
  const initial = await getMarkCatalog(user?.id);
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">마크 상점</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          활동 포인트로 마크를 구매하고, 게시글·댓글에 보이는 착용 마크를 바꿉니다.
        </p>
      </header>
      <MarkShop asPage initial={initial} />
    </div>
  );
}
