import Link from "next/link";
import { getPremiumBanners } from "@/lib/premium-banners";

export async function PromoBanners() {
  const banners = await getPremiumBanners();
  return (
    <section aria-label="프리미엄 홍보 배너">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">프리미엄 홍보</h2>
          <p className="text-sm text-muted-foreground">메인 6구좌 · 홍보게시판 연동</p>
        </div>
        <Link href="/boards/promo/write" className="touch-target inline-flex min-h-11 items-center text-sm text-primary">
          배너 등록
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6">
        {banners.map((banner) => (
          <li key={banner.id}>
            {banner.vacant ? (
              <Link
                href="/boards/promo/write"
                className="touch-target flex aspect-[3/4] min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-primary/50 bg-card px-2 text-center hover:bg-muted/50"
              >
                <span className="flex size-11 items-center justify-center rounded-full border border-primary text-xl text-primary">
                  +
                </span>
                <span className="mt-2 text-sm font-medium">홍보 등록 문의</span>
                <span className="mt-1 text-[11px] text-muted-foreground">구좌 {banner.id}</span>
              </Link>
            ) : (
              <Link
                href={banner.href}
                className="touch-target group block overflow-hidden rounded-xl border border-border bg-card focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.image}
                  alt={`${banner.sponsor} — ${banner.title}`}
                  className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
                <div className="min-h-11 px-2 py-2">
                  <p className="text-[11px] text-primary">{banner.sponsor}</p>
                  <p className="truncate text-sm font-medium">{banner.title}</p>
                </div>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
