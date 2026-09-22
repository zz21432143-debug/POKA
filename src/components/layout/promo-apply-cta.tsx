import Link from "next/link";
import { MegaphoneIcon } from "lucide-react";

export function PromoApplyCta() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
      <MegaphoneIcon className="size-5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-xs leading-5 text-emerald-900">
        지금 홍보 신청하고
        <br />
        보상을 받아보세요!
      </p>
      <Link
        href="/boards/official/write"
        className="touch-target inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-3 text-xs font-semibold text-white"
      >
        홍보하기
      </Link>
    </div>
  );
}
