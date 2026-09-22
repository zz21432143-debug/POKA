import Link from "next/link";
import { PREMIUM_BANNERS } from "@/lib/banners";

export function PromoBanners() {
  return (
    <section aria-label="프리미엄 홍보 배너">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">프리미엄 홍보</h2>
          <p className="text-sm text-muted-foreground">메인 6구좌 · 모바일 2×3</p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6">
        {PREMIUM_BANNERS.map((banner) => (
          <li key={banner.id}>
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
          </li>
        ))}
      </ul>
    </section>
  );
}
