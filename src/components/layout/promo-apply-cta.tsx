import Link from "next/link";
import { MegaphoneIcon } from "lucide-react";

/** 우측 사이드바. 매장·대회·브랜드가 POKA에 광고를 문의하도록 안내합니다. */
export function PromoApplyCta() {
  return (
    <div className="ink-panel flex items-center gap-3 rounded-[1.25rem] px-4 py-3">
      <MegaphoneIcon className="size-5 shrink-0 text-[#e7c98a]" />
      <p className="min-w-0 flex-1 text-xs leading-5 text-[#ece3d3]">
        매장 · 대회 · 브랜드를
        <br />
        <strong className="text-[#f3eadb]">딜러와 홀덤인에게 알리세요</strong>
      </p>
      <Link
        href="/advertise"
        className="touch-target inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-3 text-xs font-semibold text-white"
      >
        광고 문의
      </Link>
    </div>
  );
}
