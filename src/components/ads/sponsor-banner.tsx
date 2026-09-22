import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { SIDEBAR_SPONSORS, type SidebarSponsor } from "@/lib/sponsor";

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
        <Link
          href="/advertise"
          className="touch-target group relative flex aspect-[2/1] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary/50 bg-emerald-50/80 px-2 text-center hover:border-primary hover:bg-emerald-50"
        >
          <span className="absolute top-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
            AD
          </span>
          <span className="flex size-7 items-center justify-center rounded-full border border-primary text-primary sm:size-8">
            <PlusIcon className="size-4" />
          </span>
          <p className="mt-1 text-xs font-semibold text-emerald-900 sm:text-sm">제휴 문의</p>
        </Link>
      )}
    </div>
  );
}

export function SponsorBanner() {
  return (
    <section aria-label="스폰서 배너 가로 3구좌">
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
        A1–A3 · 300×150 가로 3칸
      </p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {SIDEBAR_SPONSORS.map((slot) => (
          <SlotCard key={slot.slot} slot={slot} />
        ))}
      </div>
    </section>
  );
}
