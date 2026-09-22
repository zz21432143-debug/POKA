import Link from "next/link";
import { AdvertiseInquiryCta } from "@/components/ads/advertise-inquiry-dialog";
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

  return (
    <section
      aria-label="사이드바 제휴 배너 공석"
      className="mx-auto flex min-h-[150px] w-full max-w-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/45 bg-emerald-50/80 px-3 py-6"
    >
      <p className="mb-3 text-xs font-semibold text-emerald-900">S · 전 페이지 고정 · 월 45만</p>
      <AdvertiseInquiryCta />
    </section>
  );
}
