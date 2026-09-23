import type { Metadata } from "next";
import Link from "next/link";
import { StarIcon } from "lucide-react";
import { getVerifiedDealers } from "@/lib/growth-ops";
import { MarkImage } from "@/components/layout/mark-image";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "인증 딜러 — POKA",
  description: "골드 뱃지를 받은 홀덤 딜러와 최근 핸드리뷰.",
};

export default async function DealersPage() {
  const dealers = await getVerifiedDealers().catch(() => []);

  return (
    <div className="flex flex-col gap-5">
      <header className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
        <p className="inline-flex items-center gap-1 text-xs font-bold tracking-wide text-amber-800">
          <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
          VERIFIED
        </p>
        <h1 className="mt-2 text-2xl font-semibold">인증 딜러</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          현장에서 검증된 홀덤 딜러입니다. 닉네임 옆 골드 뱃지로 글·댓글·프로필에 표시됩니다. 핸드를
          눌러 투표할 수 있습니다.
        </p>
      </header>
      {dealers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
          아직 공개된 인증 딜러가 없습니다.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {dealers.map((dealer) => {
            const profileHref = `/u/${encodeURIComponent(dealer.nickname)}`;
            const handHref = dealer.latestHand ? `/posts/${dealer.latestHand.id}` : profileHref;
            return (
              <li key={dealer.id}>
                <article className="flex h-full flex-col rounded-2xl border border-amber-200 bg-white p-4 shadow-sm ring-1 ring-amber-100">
                  <Link href={profileHref} className="flex items-center gap-3">
                    <span className="flex size-14 items-center justify-center overflow-hidden rounded-full ring-2 ring-amber-300">
                      <MarkImage src={dealer.profileMarkImageUrl} alt="" size={56} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-base font-bold">{dealer.nickname}</span>
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          <StarIcon className="size-3 fill-amber-400 text-amber-400" />
                          인증 딜러
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Lv.{dealer.level}</span>
                    </span>
                  </Link>
                  {dealer.latestHand ? (
                    <Link href={handHref} className="mt-3 rounded-xl bg-amber-50/80 px-3 py-2.5 hover:bg-amber-50">
                      <span className="block text-[11px] font-semibold text-amber-800">최근 핸드리뷰</span>
                      <span className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">
                        {dealer.latestHand.title}
                      </span>
                    </Link>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">아직 공개 핸드가 없습니다.</p>
                  )}
                  <Link href={profileHref} className="mt-auto pt-3 text-sm font-semibold text-primary">
                    프로필 보기
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
