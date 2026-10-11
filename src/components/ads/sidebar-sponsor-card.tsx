import Link from "next/link";
import { FreePromoBanner } from "@/components/ads/free-promo-banner";
import { pickFill, type DirectCreative } from "@/lib/inventory-policy";

export function SidebarSponsorCard({ unit }: { unit: DirectCreative | null }) {
  const fill = pickFill(unit, "cta", true);

  if (fill.kind === "direct") {
    const creative = fill.creative;
    return (
      <section aria-label="사이드바 제휴 배너" className="mx-auto w-full max-w-[300px]">
        <Link
          href={creative.href}
          className="group relative block overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={creative.imageUrl ?? ""}
            alt={creative.title || creative.advertiser}
            width={300}
            height={250}
            className="aspect-[300/250] w-full object-cover"
          />
          <span className="absolute top-1.5 left-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
            {creative.mark}
          </span>
        </Link>
        <p className="mt-1 truncate px-0.5 text-[11px] text-muted-foreground">
          {creative.advertiser || creative.title}
        </p>
      </section>
    );
  }

  // 제휴 배너가 비어 있으면 "POKA 무료 홍보 이벤트"로 채웁니다.
  return (
    <section aria-label="POKA 무료 홍보 이벤트" className="mx-auto w-full max-w-[300px]">
      <FreePromoBanner variant="card" />
    </section>
  );
}
