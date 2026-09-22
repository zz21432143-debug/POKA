import Link from "next/link";
import { MegaphoneIcon, PlusIcon } from "lucide-react";
import { getPremiumBanners } from "@/lib/premium-banners";

/** 왕좌의 게임 포스터(약 998×1397)에 맞춘 세로형 비율 */
const POSTER_FRAME = "aspect-[5/7]";

function posterMark(tag?: string | null, isPaid?: boolean) {
  if (isPaid) return "AD";
  if (tag === "제휴" || tag === "협찬") return "제휴";
  if (tag === "나이트" || tag === "멤버십") return "AD";
  return "제휴";
}

export async function FeaturedPromos() {
  const banners = await getPremiumBanners();

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <MegaphoneIcon className="size-4 text-primary" />
          지금, 진행중인 홍보 포스터
        </h2>
        <Link href="/boards/official" className="text-xs text-muted-foreground hover:text-primary">
          전체보기
        </Link>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        홈에는 진행 중 포스터 3장만 보여 줍니다. 나머지는 공식 홍보 게시판에서 볼 수 있습니다.
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {banners
          .filter((banner) => !banner.vacant)
          .slice(0, 3)
          .map((banner) => (
          <li key={banner.id} className="mx-auto w-full max-w-[280px] sm:max-w-none">
            {banner.vacant ? (
              <Link
                href="/advertise"
                className={`touch-target group relative flex ${POSTER_FRAME} flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/45 bg-emerald-50/80 px-4 text-center hover:border-primary`}
              >
                <span className="absolute top-3 left-3 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                  AD
                </span>
                <span className="flex size-10 items-center justify-center rounded-full border border-primary text-primary">
                  <PlusIcon className="size-5" />
                </span>
                <p className="mt-2 text-sm font-semibold text-emerald-900">홍보 포스터 구좌 {banner.id}</p>
                <p className="mt-1 text-xs text-emerald-800/80">제휴 문의하기</p>
              </Link>
            ) : (
              <Link
                href={banner.href}
                className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:border-primary/50"
              >
                <div className={`relative ${POSTER_FRAME} bg-black`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                      {banner.tag || "홍보"}
                    </span>
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white ring-1 ring-white/30">
                      {posterMark(banner.tag, banner.isPaid)}
                    </span>
                  </div>
                </div>
                <div className="p-2.5">
                  <h3 className="text-sm font-bold leading-snug">{banner.title}</h3>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {[banner.location, banner.sponsor].filter(Boolean).join(" · ")}
                  </p>
                  <span className="mt-2 inline-flex h-8 items-center rounded-full bg-primary px-3 text-[11px] font-semibold text-white">
                    자세히 보기 →
                  </span>
                </div>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
