import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { getFeedCreatives } from "@/lib/inventory";
import { pickFill, type DirectCreative } from "@/lib/inventory-policy";
import type { AdSensePlacement } from "@/lib/adsense";
import Link from "next/link";

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
  const units: Array<{ unit: DirectCreative | null; google: AdSensePlacement }> = [
    { unit: a1, google: "a1" },
    { unit: a2, google: "a2" },
    { unit: a3, google: "a3" },
  ];

  return (
    <section aria-label="추천 배너" className="mt-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {units.map((item, index) => {
          const fill = pickFill(item.unit, "adsense", true);
          return (
            <div key={item.google} className="min-w-0">
              {fill.kind === "direct" ? (
                <DirectCard creative={fill.creative} />
              ) : (
                <GoogleAdUnit placement={item.google} />
              )}
              <span className="sr-only">배너 {index + 1}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
