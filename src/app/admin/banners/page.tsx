import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BannerAdmin } from "@/components/admin/banner-admin";
import { SponsorAdmin } from "@/components/admin/sponsor-admin";
import { getCurrentUser } from "@/lib/current-user";
import { ensureBannerSlots } from "@/lib/premium-banners";
import { ensureSponsorUnits } from "@/lib/inventory";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const metadata: Metadata = { title: "배너 관리", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();
  await ensureBannerSlots();
  await ensureSponsorUnits();
  const [slots, promo, units] = await Promise.all([
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
    prisma.sponsorUnit.findMany({ orderBy: { placement: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">배너 구좌 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          메인 3×2(B1–B6)는 홍보글로 채우고, A1–A3·사이드바·인피드는 직판 소재로 지정합니다. A칸이 비면
          구글이 채웁니다. 프리미엄·사이드바 공석은 문의 CTA입니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/admin" className="inline-flex min-h-11 items-center text-sm text-primary">
            관리자 페이지
          </Link>
          {user.isMaster ? (
            <Link href="/admin/members" className="inline-flex min-h-11 items-center text-sm text-primary">
              인증 달기
            </Link>
          ) : null}
        </div>
      </header>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">메인 프리미엄 B1–B6</h2>
        <BannerAdmin slots={slots} promo={promo} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">사이드바 · 인피드 직판</h2>
        <SponsorAdmin units={units} />
      </section>
    </div>
  );
}
