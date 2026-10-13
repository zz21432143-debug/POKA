import Link from "next/link";
import { pickFill, type DirectCreative } from "@/lib/inventory-policy";
import { PromoApplyCta } from "@/components/layout/promo-apply-cta";

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

  // 비어 있으면 '광고 문의' 작은 칸 하나(이 자리를 살 수 있다는 안내). 큰 무료 홍보 포스터는 반복하지 않습니다.
  return <PromoApplyCta />;
}
