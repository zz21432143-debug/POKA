import Link from "next/link";
import { NATIVE_SPONSOR } from "@/lib/sponsor";

export function SponsoredPostLine() {
  return (
    <li className="bg-emerald-50/70">
      <Link
        href={NATIVE_SPONSOR.href}
        className="touch-target flex min-h-14 items-center gap-3 px-4 py-3.5 hover:bg-emerald-50"
      >
        <span className="h-6 shrink-0 rounded-full border border-primary/30 bg-white px-2.5 text-[11px] font-semibold text-emerald-800">
          제휴 홍보
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-emerald-950">{NATIVE_SPONSOR.title}</p>
          <p className="mt-1 truncate text-xs text-emerald-800/80">
            {NATIVE_SPONSOR.advertiser}
            {" · "}
            {NATIVE_SPONSOR.hint}
          </p>
        </div>
        <span className="hidden shrink-0 text-[11px] font-medium text-primary sm:inline">AD</span>
      </Link>
    </li>
  );
}
