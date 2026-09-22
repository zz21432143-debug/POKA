import Link from "next/link";
import { getPremiumBanners } from "@/lib/premium-banners";

export async function PromoBanners() {
  const banners = await getPremiumBanners();
  return (
    <section aria-label="프리미엄 홍보 배너">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">프리미엄 홍보</h2>
          <p className="text-sm text-muted-foreground">메인 6구좌 · 3열 2줄</p>
        </div>
        <Link href="/boards/promo/write" className="touch-target inline-flex min-h-11 items-center text-sm text-primary">
          배너 등록
        </Link>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:gap-4">
        {banners.map((banner) => (
          <li key={banner.id}>
            {banner.vacant ? (
              <Link
                href="/boards/promo/write"
                className="touch-target flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-primary/50 bg-card px-2 py-6 text-center hover:bg-muted/50 sm:min-h-64"
              >
                <span className="flex size-12 items-center justify-center rounded-full border border-primary text-2xl text-primary sm:size-14">
                  +
                </span>
                <span className="mt-2 text-sm font-semibold sm:text-base">홍보 등록 문의</span>
                <span className="mt-1 text-[11px] text-muted-foreground">구좌 {banner.id}</span>
              </Link>
            ) : (
              <Link
                href={banner.href}
                className="touch-target group block overflow-hidden rounded-2xl border border-border bg-card focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.image}
                  alt={`${banner.sponsor} — ${banner.title}`}
                  className="aspect-[4/5] w-full object-cover transition-transform group-hover:scale-[1.03] sm:aspect-[3/4]"
                />
                <div className="min-h-14 px-2 py-2 sm:px-3 sm:py-3">
                  <p className="text-[11px] text-primary sm:text-xs">{banner.sponsor}</p>
                  <p className="text-sm font-semibold leading-snug sm:text-base">{banner.title}</p>
                  {banner.location || banner.tag ? (
                    <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-sm">
                      {[banner.location, banner.tag].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
