import Link from "next/link";
import { MegaphoneIcon } from "lucide-react";

export function PromoApplyCta() {
  return (
    <div className="ink-panel flex items-center gap-3 rounded-[1.25rem] px-4 py-3">
      <MegaphoneIcon className="size-5 shrink-0 text-[#C59B27]" />
      <p className="min-w-0 flex-1 text-xs leading-5 text-[#E5E7EB]">
        지금 홍보 신청하고
        <br />
        보상을 받아보세요!
      </p>
      <Link
        href="/advertise"
        className="touch-target inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-3 text-xs font-semibold text-white"
      >
        홍보하기
      </Link>
    </div>
  );
}
