import Link from "next/link";
import { getPremiumBanners } from "@/lib/premium-banners";
import { AdvertiseInquiryDialog } from "@/components/ads/advertise-inquiry-dialog";

export async function PromoBanners() {
  const banners = await getPremiumBanners();
  return (
    <section aria-label="프리미엄 제휴 배너 6구좌">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">프리미엄 제휴</h2>
          <p className="text-sm text-muted-foreground">메인 상단 3×2 · 월정액 6구좌</p>
        </div>
        <Link href="/advertise" className="touch-target inline-flex min-h-11 items-center text-sm text-primary">
          구좌 안내
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
        {banners.map((banner) => (
          <li key={banner.id}>
            {banner.vacant ? (
              <div className="touch-target flex min-h-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/50 bg-emerald-50/70 px-2 py-6 text-center sm:min-h-64">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">B{banner.id}</p>
                <p className="mt-2 text-sm font-semibold text-emerald-900">제휴 구좌 비어 있음</p>
                <div className="mt-3">
                  <AdvertiseInquiryDialog triggerClassName="inline-flex min-h-10 items-center rounded-full bg-primary px-3 text-xs font-semibold text-white" />
                </div>
              </div>
            ) : (
              <Link
                href={banner.href}
                className="touch-target group block overflow-hidden rounded-2xl border border-border bg-card focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative aspect-[5/7] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.image}
                    alt={`${banner.sponsor} — ${banner.title}`}
                    className="h-full w-full object-contain transition-transform group-hover:scale-[1.03]"
                  />
                  <span className="absolute top-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white ring-1 ring-white/30">
                    {banner.mark}
                  </span>
                </div>
                <div className="min-h-14 px-2 py-2 sm:px-3 sm:py-3">
                  <p className="text-[11px] text-primary sm:text-xs">
                    B{banner.id} · {banner.sponsor}
                  </p>
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
