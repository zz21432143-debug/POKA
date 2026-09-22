import Link from "next/link";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { getFeedCreatives } from "@/lib/inventory";
import { pickFill, type DirectCreative } from "@/lib/inventory-policy";
import type { AdSensePlacement } from "@/lib/adsense";

function DirectCard({ creative }: { creative: DirectCreative }) {
  return (
    <Link
      href={creative.href}
      className="group relative block overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={creative.imageUrl ?? ""}
        alt={creative.title || creative.advertiser}
        width={300}
        height={150}
        className="aspect-[2/1] w-full object-cover"
      />
      <span className="absolute top-1.5 left-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
        {creative.mark}
      </span>
    </Link>
  );
}

export async function FeedAdRow() {
  const [a1, a2, a3] = await getFeedCreatives().catch(() => [null, null, null] as const);
  const units: Array<{ label: "A1" | "A2" | "A3"; unit: DirectCreative | null; google: AdSensePlacement }> = [
    { label: "A1", unit: a1, google: "a1" },
    { label: "A2", unit: a2, google: "a2" },
    { label: "A3", unit: a3, google: "a3" },
  ];

  return (
    <section aria-label="본문 하단 광고 가로 3구좌" className="mt-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
          A1–A3 · 300×150 가로 3칸
        </p>
        <Link href="/advertise" className="text-[11px] font-medium text-primary hover:underline">
          직판 제휴 문의
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {units.map((item) => {
          const fill = pickFill(item.unit, "adsense", true);
          return (
            <div key={item.label} className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground">{item.label}</p>
              {fill.kind === "direct" ? (
                <DirectCard creative={fill.creative} />
              ) : (
                <GoogleAdUnit placement={item.google} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
