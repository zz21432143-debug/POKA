import Link from "next/link";
import { getPremiumBanners } from "@/lib/premium-banners";
import { AdvertiseInquiryDialog } from "@/components/ads/advertise-inquiry-dialog";

export async function PromoBanners() {
  const banners = await getPremiumBanners();
  if (banners.every((banner) => banner.vacant)) {
    return (
      <section
        aria-label="프리미엄 제휴 배너"
        className="ink-panel flex flex-col items-start gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-base font-bold text-white">프리미엄 제휴 배너</h2>
          <p className="mt-1 text-sm text-[#D1D5DB]">홈 화면 6구좌에 매장·대회·브랜드를 소개해 보세요.</p>
        </div>
        <AdvertiseInquiryDialog
          triggerClassName="touch-target inline-flex min-h-11 shrink-0 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white"
          triggerLabel="제휴 / 광고 문의하기"
        />
      </section>
    );
  }
  return (
    <section aria-label="프리미엄 제휴 배너 6구좌">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">프리미엄 제휴</h2>
          <p className="text-sm text-[#D1D5DB]">홈 3×2 · 제휴 6구좌</p>
        </div>
        <AdvertiseInquiryDialog
          triggerClassName="touch-target inline-flex min-h-11 items-center text-sm font-medium text-primary"
          triggerLabel="제휴 / 광고 문의하기"
        />
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
        {banners.map((banner) => (
          <li key={banner.id}>
            {banner.vacant ? (
              <div className="ink-panel touch-target flex aspect-[4/5] flex-col items-center justify-center rounded-2xl px-2 text-center">
                <p className="text-[11px] font-semibold tracking-wide text-[#9CA3AF]">B{banner.id}</p>
                <p className="mt-1 text-sm font-semibold text-[#E5E7EB]">제휴 구좌 비어 있음</p>
                <div className="mt-2">
                  <AdvertiseInquiryDialog triggerClassName="inline-flex min-h-10 items-center rounded-full bg-primary px-3 text-xs font-semibold text-white" />
                </div>
              </div>
            ) : (
              <Link
                href={banner.href}
                className="touch-target group block overflow-hidden rounded-2xl bg-card shadow-[0_2px_8px_rgb(0_0_0/0.06)] focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative aspect-[4/5] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.image}
                    alt={`${banner.sponsor} — ${banner.title}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                  />
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white ring-1 ring-white/30">
                    {banner.mark}
                  </span>
                </div>
                <div className="px-2 py-1.5 sm:px-2.5 sm:py-2">
                  <p className="truncate text-[11px] text-primary">
                    B{banner.id} · {banner.sponsor}
                  </p>
                  <p className="line-clamp-1 text-sm font-semibold leading-snug">{banner.title}</p>
                </div>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
