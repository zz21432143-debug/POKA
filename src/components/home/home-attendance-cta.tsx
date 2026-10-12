import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { ATTENDANCE_POINTS, STREAK_MILESTONES } from "@/lib/rewards";
import { BrandIcon } from "@/components/brand/brand-icon";

/** 홈 출석체크 안내. 매일 포인트와 연속 출석 보너스를 챙기도록 출석 페이지로 보냅니다. */
export function HomeAttendanceCta() {
  const days = STREAK_MILESTONES.map((row) => row.day).join("·");
  return (
    <Link
      href="/attendance"
      className="lounge-card touch-target flex min-h-16 items-center gap-3 rounded-[1.35rem] px-4 py-3 hover:bg-white/[0.04]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#7a1c22] text-[#f6efe2]">
        <BrandIcon name="omamori" className="size-6" active />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-white">오늘 출석체크 하셨나요?</span>
        <span className="mt-0.5 block text-xs text-[#D1C7B5]">
          매일 {ATTENDANCE_POINTS}P · {days}일 연속 출석 보너스
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-[#e7c98a]">
        출석하기
        <ChevronRightIcon className="size-4" />
      </span>
    </Link>
  );
}
