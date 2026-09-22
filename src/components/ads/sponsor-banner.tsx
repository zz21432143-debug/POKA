import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { SIDEBAR_SPONSORS, type SidebarSponsor } from "@/lib/sponsor";

function SlotCard({ slot, feed }: { slot: SidebarSponsor; feed: boolean }) {
  const filled = Boolean(slot.imageUrl);
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
        A{slot.slot} · 300×150
        {feed ? " · 목록 아래" : " · 프로필 아래"}
      </p>
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
          <span className="absolute top-2 left-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
            {slot.mark}
          </span>
        </Link>
      ) : (
        <Link
          href="/advertise"
          className="touch-target group relative flex aspect-[2/1] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary/50 bg-emerald-50/80 px-3 text-center hover:border-primary hover:bg-emerald-50"
        >
          <span className="absolute top-2 left-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
            AD
          </span>
          <span className="flex size-8 items-center justify-center rounded-full border border-primary text-primary">
            <PlusIcon className="size-4" />
          </span>
          <p className="mt-1.5 text-sm font-semibold text-emerald-900">제휴 문의하기</p>
          <p className="text-[11px] text-emerald-800/80">빈 구좌 {slot.slot}/3</p>
        </Link>
      )}
    </div>
  );
}

export function SponsorBanner({ placement = "sidebar" }: { placement?: "sidebar" | "feed" }) {
  const feed = placement === "feed";
  return (
    <section
      aria-label="스폰서 배너 3구좌"
      className={feed ? "mx-auto flex w-full max-w-[300px] flex-col gap-3" : "flex w-full flex-col gap-3"}
    >
      {SIDEBAR_SPONSORS.map((slot) => (
        <SlotCard key={slot.slot} slot={slot} feed={feed} />
      ))}
    </section>
  );
}
