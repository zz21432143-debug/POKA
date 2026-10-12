import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BannerAdmin } from "@/components/admin/banner-admin";
import { SponsorAdmin } from "@/components/admin/sponsor-admin";
import { getCurrentUser } from "@/lib/current-user";
import { ensureBannerSlots } from "@/lib/premium-banners";
import { ensureSponsorUnits } from "@/lib/inventory";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { BANNER_SIZE, PLACEMENT_META, POSTER_SIZE } from "@/lib/inventory-policy";

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
        <ul className="mt-2 grid gap-1 rounded-xl border border-border bg-card p-3 text-sm sm:grid-cols-3">
          <li>
            <b>포스터 홍보물</b> (B1–B6)
            <br />
            <span className="text-muted-foreground">{POSTER_SIZE}</span>
          </li>
          <li>
            <b>배너 홍보물</b> (A1–A3)
            <br />
            <span className="text-muted-foreground">{BANNER_SIZE}</span>
          </li>
          <li>
            <b>사이드바</b> (S)
            <br />
            <span className="text-muted-foreground">{PLACEMENT_META.SIDEBAR.size}</span>
          </li>
          <li className="text-xs text-muted-foreground sm:col-span-3">
            비율이 다르면 가장자리가 잘립니다. 글자·로고는 가장자리에서 안쪽 5% 이상 띄워 주세요. JPG·PNG·WEBP, 3MB 이하.
          </li>
        </ul>
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
