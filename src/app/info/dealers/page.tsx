import type { Metadata } from "next";
import Link from "next/link";
import { StarIcon } from "lucide-react";
import { getVerifiedDealers } from "@/lib/growth-ops";
import { MarkImage } from "@/components/layout/mark-image";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "인증",
  description: "마스터가 단 골드 뱃지 인증 회원과 최근 핸드리뷰.",
};

export default async function DealersPage() {
  const dealers = await getVerifiedDealers().catch(() => []);

  return (
    <div className="flex flex-col gap-5">
      <header className="board-intro">
        <p className="inline-flex items-center gap-1 text-xs font-bold tracking-wide text-[#C59B27]">
          <StarIcon className="size-3.5 fill-[#C59B27] text-[#C59B27]" />
          VERIFIED
        </p>
        <h1 className="mt-2">인증</h1>
        <p className="mt-2 max-w-xl">
          마스터가 직접 단 골드 뱃지입니다. 닉네임 옆에 「인증」으로 표시됩니다.
        </p>
      </header>
      {dealers.length === 0 ? (
        <p className="ink-panel rounded-2xl px-4 py-10 text-center text-sm text-[#D1D5DB]">
          아직 공개된 인증 회원이 없습니다.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {dealers.map((dealer) => {
            const profileHref = `/u/${encodeURIComponent(dealer.nickname)}`;
            const handHref = dealer.latestHand ? `/posts/${dealer.latestHand.id}` : profileHref;
            return (
              <li key={dealer.id}>
                <article className="ink-panel flex h-full flex-col rounded-2xl p-4">
                  <Link href={profileHref} className="flex items-center gap-3">
                    <span className="flex size-14 items-center justify-center overflow-hidden rounded-full ring-2 ring-amber-300">
                      <MarkImage src={dealer.profileMarkImageUrl} alt="" size={56} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-base font-bold text-white">{dealer.nickname}</span>
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                          <StarIcon className="size-3 fill-amber-400 text-amber-400" />
                          인증
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-[#9CA3AF]">Lv.{dealer.level}</span>
                    </span>
                  </Link>
                  {dealer.latestHand ? (
                    <Link href={handHref} className="mt-3 rounded-xl bg-[#2a2218] px-3 py-2.5 hover:bg-[#3a2e20]">
                      <span className="block text-[11px] font-semibold text-[#C59B27]">최근 핸드리뷰</span>
                      <span className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-white">
                        {dealer.latestHand.title}
                      </span>
                    </Link>
                  ) : (
                    <p className="mt-3 text-sm text-[#9CA3AF]">아직 공개 핸드가 없습니다.</p>
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
