import Link from "next/link";
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
          마크는 3,000P입니다. 출석으로 하루 최대 375P라 약 8일이면 살 수 있습니다. 레벨은 활동
          기간을 나타낼 뿐이고, 구매·글쓰기와는 별개입니다.
        </p>
        {user ? null : (
          <p className="mt-2 text-sm">
            <Link href="/login?next=/shop" className="font-semibold text-primary hover:underline">
              로그인
            </Link>
            하면 포인트로 마크를 사고 착용할 수 있습니다.
          </p>
        )}
      </header>
      <MarkShop asPage initial={initial} />
    </div>
  );
}
