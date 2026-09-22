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
          포인트로 마크를 구매·착용합니다. 프레임(테두리)과 이펙트(후광) 구좌도 같은 상점에 준비되어 있습니다.
        </p>
      </header>
      <MarkShop asPage initial={initial} />
    </div>
  );
}
