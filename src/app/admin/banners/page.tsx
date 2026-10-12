import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BannerAdmin } from "@/components/admin/banner-admin";
import { SponsorAdmin } from "@/components/admin/sponsor-admin";
import { getCurrentUser } from "@/lib/current-user";
import { ensureBannerSlots } from "@/lib/premium-banners";
import { ensureSponsorUnits } from "@/lib/inventory";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { AdSlotGuide } from "@/components/admin/ad-slot-guide";

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
        <h1 className="text-2xl font-semibold">홍보 자리 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          사이트에 광고·홍보가 들어가는 자리는 네 종류(B·A·S·C)입니다. 아래 그림에서 위치를 확인하세요. 사진은 아무 크기나
          올려도 각 자리에 맞춰 자동으로 정렬됩니다.
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
      <AdSlotGuide />
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">① 메인 포스터 B1–B6</h2>
        <p className="text-sm text-muted-foreground">
          사진은 「공식 홍보」 게시판에 글을 쓰면서 올립니다. 여기서는 어느 글을 몇 번 자리에 보여줄지만 정합니다.
        </p>
        <BannerAdmin slots={slots} promo={promo} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">② 하단 가로 배너 A · 오른쪽 사이드 배너 S · 글 목록 속 광고 C</h2>
        <p className="text-sm text-muted-foreground">각 자리에 사진·제목·링크를 넣고 「사용」에 체크한 뒤 저장하세요.</p>
        <SponsorAdmin units={units} />
      </section>
    </div>
  );
}
