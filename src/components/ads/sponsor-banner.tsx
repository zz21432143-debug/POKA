import Link from "next/link";
import { SIDEBAR_SPONSORS, type SidebarSponsor } from "@/lib/sponsor";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";

function SlotCard({ slot }: { slot: SidebarSponsor }) {
  const filled = Boolean(slot.imageUrl);
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground">A{slot.slot}</p>
      {filled ? (
        <Link
          href={slot.href}
          className="group relative block overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slot.imageUrl ?? ""}
            alt={slot.title}
            width={300}
            height={150}
            className="aspect-[2/1] w-full object-cover"
          />
          <span className="absolute top-1.5 left-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
            {slot.mark}
          </span>
        </Link>
      ) : (
        <GoogleAdUnit slot={slot.slot} />
      )}
    </div>
  );
}

export function SponsorBanner() {
  return (
    <section aria-label="본문 하단 광고 가로 3구좌">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
          A1–A3 · 300×150 가로 3칸
        </p>
        <Link href="/advertise" className="text-[11px] font-medium text-primary hover:underline">
          직판 제휴 문의
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {SIDEBAR_SPONSORS.map((slot) => (
          <SlotCard key={slot.slot} slot={slot} />
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
        직판이 없는 칸은 구글이 채웁니다. 구글이 연락하는 방식이 아닙니다.
      </p>
    </section>
  );
}
