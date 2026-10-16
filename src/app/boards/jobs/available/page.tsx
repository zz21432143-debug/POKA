import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { AvailabilityForm } from "@/components/jobs/availability-form";
import { getCurrentUser } from "@/lib/current-user";
import { readAvailability } from "@/lib/job-board";
import { todayKstDate } from "@/lib/dates";
import { JOB_REGIONS } from "@/lib/job-status";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "내가 가능한 날 · 빈자리 알림", robots: { index: false, follow: true } };

/** 딜러 「가능한 날」 등록: 그 날짜 · 지역에 빈자리가 생기면 알림 */
export default async function AvailablePage() {
  const user = await getCurrentUser().catch(() => null);
  const current = user ? await readAvailability(user.id) : null;
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <header className="board-intro">
        <h1 className="text-2xl font-black text-white">🙋 내가 가능한 날</h1>
        <p className="mt-1.5 text-sm text-[#d6cdee]">
          일할 수 있는 날과 지역을 골라 두면, 그날 빈자리가 올라올 때 알림을 보내 드려요. 매장에는 「이날 가능한 딜러 ○명」만 보이고 닉네임은 보이지 않아요.
        </p>
      </header>
      {user ? (
        <AvailabilityForm initial={current} today={todayKstDate()} regions={[...JOB_REGIONS]} />
      ) : (
        <Link href="/login?next=/boards/jobs/available" className="arcade-btn btn-main grid min-h-12 place-items-center text-base">
          로그인하고 가능한 날 등록
        </Link>
      )}
      <Link href="/boards/jobs/slots" className="text-center text-sm font-bold text-[#e7c98a] underline">
        📅 날짜별 빈자리 보러 가기
      </Link>
    </div>
  );
}
