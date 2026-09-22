import { notFound } from "next/navigation";
import { BannerAdmin } from "@/components/admin/banner-admin";
import { getCurrentUser } from "@/lib/current-user";
import { ensureBannerSlots } from "@/lib/premium-banners";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();
  await ensureBannerSlots();
  const [slots, promo] = await Promise.all([
    prisma.bannerSlot.findMany({
      orderBy: { slot: "asc" },
      include: { post: { select: { id: true, title: true } } },
    }),
    prisma.post.findMany({
      where: { boardType: "PROMO" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, title: true, isPaid: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">배너 구좌 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          메인 6구좌를 수동 지정하거나 최신 홍보글로 자동 채웁니다.
        </p>
        <Link href="/admin/reports" className="mt-2 inline-flex min-h-11 items-center text-sm text-primary">
          신고 처리
        </Link>
      </header>
      <BannerAdmin slots={slots} promo={promo} />
    </div>
  );
}
