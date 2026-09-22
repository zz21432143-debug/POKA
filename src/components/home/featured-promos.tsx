import Link from "next/link";
import { MegaphoneIcon, PlusIcon } from "lucide-react";
import { getPremiumBanners } from "@/lib/premium-banners";

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
        메인 6구좌는 공식 홍보·스폰서 포스터입니다. 빈 칸은 제휴 문의로 연결됩니다.
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {banners.map((banner) => (
          <li key={banner.id}>
            {banner.vacant ? (
              <Link
                href="/advertise"
                className="touch-target group relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/45 bg-emerald-50/80 px-4 text-center hover:border-primary"
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
                className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-black shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="h-full w-full object-contain"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                    {banner.tag || "홍보"}
                  </span>
                  <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white ring-1 ring-white/30">
                    {posterMark(banner.tag, banner.isPaid)}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                  <h3 className="text-[15px] font-bold leading-snug">{banner.title}</h3>
                  <p className="mt-1 truncate text-[11px] text-white/75">
                    {[banner.location, banner.sponsor].filter(Boolean).join(" · ")}
                  </p>
                  <span className="mt-2 inline-flex h-7 items-center rounded-full bg-primary px-3 text-[11px] font-semibold">
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
