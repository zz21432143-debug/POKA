import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { SIDEBAR_SPONSOR } from "@/lib/sponsor";

export function SponsorBanner({ placement = "sidebar" }: { placement?: "sidebar" | "feed" }) {
  const filled = Boolean(SIDEBAR_SPONSOR.imageUrl);
  const feed = placement === "feed";

  return (
    <section aria-label="스폰서 배너 영역" className={feed ? "mx-auto w-full max-w-[300px]" : "w-full"}>
      <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
        {feed ? "A · 사이드바 배너 · 이 너비에서는 목록 아래" : "A · 사이드바 배너 · 프로필 아래"}
        <span className="ml-1 font-normal">300×150</span>
      </p>
      {filled ? (
        <Link
          href={SIDEBAR_SPONSOR.href}
          className="group relative block overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SIDEBAR_SPONSOR.imageUrl ?? ""}
            alt={SIDEBAR_SPONSOR.title}
            width={300}
            height={150}
            className="aspect-[2/1] w-full object-cover"
          />
          <span className="absolute top-2 left-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
            {SIDEBAR_SPONSOR.mark}
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
          <span className="flex size-9 items-center justify-center rounded-full border border-primary text-primary transition-transform group-hover:scale-105">
            <PlusIcon className="size-5" />
          </span>
          <p className="mt-2 text-sm font-semibold text-emerald-900">제휴 문의하기</p>
          <p className="mt-0.5 text-[11px] text-emerald-800/80">빈 구좌 · 맞춤 이미지 배너</p>
        </Link>
      )}
    </section>
  );
}
