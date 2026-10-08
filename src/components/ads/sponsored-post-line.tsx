import Link from "next/link";
import { pickFill, type DirectCreative } from "@/lib/inventory-policy";

export function SponsoredPostLine({ unit }: { unit: DirectCreative | null }) {
  const fill = pickFill(unit, "hide");
  if (fill.kind !== "direct") return null;
  const creative = fill.creative;

  return (
    <li className="bg-[#2a2218]">
      <Link
        href={creative.href}
        className="touch-target flex min-h-14 items-center gap-3 px-4 py-3.5 hover:bg-[#3a2e20]"
      >
        <span className="h-6 shrink-0 rounded-full border border-[#C59B27] bg-[#1C1819] px-2.5 text-[11px] font-semibold text-[#C59B27]">
          {creative.mark}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold leading-snug text-white">{creative.title}</p>
          <p className="mt-1 truncate text-xs text-[#9CA3AF]">
            {creative.advertiser}
            {creative.advertiser ? " · " : ""}
            커뮤니티 제휴 · 목록 3번째와 4번째 사이
          </p>
        </div>
        <span className="hidden shrink-0 text-[11px] font-medium text-primary sm:inline">AD</span>
      </Link>
    </li>
  );
}
