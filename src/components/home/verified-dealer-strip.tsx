import Link from "next/link";
import { StarIcon } from "lucide-react";
import { MarkImage } from "@/components/layout/mark-image";

export function VerifiedDealerStrip({
  dealers,
}: {
  dealers: {
    id: string;
    nickname: string;
    level: number;
    profileMarkImageUrl: string | null;
    latestHand: { id: string; title: string } | null;
  }[];
}) {
  if (dealers.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1 text-xs font-bold tracking-wide text-amber-800">
            <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
            인증
          </p>
          <p className="mt-1 text-sm text-muted-foreground">인증 회원의 최근 핸드입니다.</p>
        </div>
        <Link href="/community" className="text-sm font-semibold text-amber-800 hover:text-amber-950">
          커뮤니티
        </Link>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {dealers.slice(0, 4).map((dealer) => {
          const href = dealer.latestHand
            ? `/posts/${dealer.latestHand.id}`
            : `/u/${encodeURIComponent(dealer.nickname)}`;
          return (
            <li key={dealer.id}>
              <Link
                href={href}
                className="touch-target flex min-h-14 items-center gap-3 rounded-xl border border-amber-100 bg-white px-3 py-2 hover:border-amber-300"
              >
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-amber-300">
                  <MarkImage src={dealer.profileMarkImageUrl} alt="" size={40} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{dealer.nickname}</span>
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                      인증
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {dealer.latestHand?.title ?? `Lv.${dealer.level} · 프로필`}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
