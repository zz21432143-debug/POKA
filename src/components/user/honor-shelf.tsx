import Link from "next/link";
import { PotTitleBadge } from "@/components/honor/crowned-frame";
import { listHonorHistory } from "@/lib/pot-titles";

/** 받은 기간 표시: 전체 · 주(월요일 날짜) · 달 */
function stampText(stamp: string) {
  if (stamp === "all") return "전체 기록";
  if (/^\d{4}-\d{2}$/.test(stamp)) return `${Number(stamp.slice(5))}월`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(stamp)) return `${Number(stamp.slice(5, 7))}/${Number(stamp.slice(8))} 주`;
  return stamp;
}

const dayText = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "2-digit", month: "numeric", day: "numeric" }).format(new Date(iso));

/** 프로필: 지금 가진 칭호 + 예전에 받았던 칭호 기록 */
export async function HonorShelf({ userId, nickname, mine }: { userId: string; nickname: string; mine: boolean }) {
  const history = await listHonorHistory(userId).catch(() => []);
  return (
    <section aria-label="칭호" data-honor-shelf className="grid gap-2 rounded-2xl border border-[#c9a25c]/30 bg-black/30 p-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-black text-[#e7c98a]">{mine ? "내 칭호" : "칭호"}</h2>
        <Link href="/ranking" className="ml-auto text-xs font-bold text-[#c9a25c]">
          칭호 8종 보기 ›
        </Link>
      </div>
      <div data-honor-now className="flex min-h-8 flex-wrap items-center gap-1.5">
        <PotTitleBadge nickname={nickname} max={8} />
        {/* 하나도 없으면 아래 안내만 보임 */}
        <span className="text-xs text-zinc-400 [&:not(:only-child)]:hidden">지금 가진 칭호가 없어요. 랭킹 1위에 도전해 보세요!</span>
      </div>
      {history.length ? (
        <details className="group rounded-xl border border-white/10 bg-black/30 px-2 py-1">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-bold text-zinc-200 [&::-webkit-details-marker]:hidden">
            받았던 칭호 {history.length}개
            <span className="ml-auto text-xs text-[#c9a25c] group-open:hidden">펼치기</span>
          </summary>
          <ul data-honor-history className="grid gap-1 pb-1">
            {history.map((h) => (
              <li key={`${h.key}-${h.rank}-${h.stamp}`} className="flex min-h-9 items-center gap-2 text-sm">
                <span className="shrink-0">{h.icon}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-white">{h.title}</span>
                <span className="shrink-0 text-xs text-zinc-400">{stampText(h.stamp)}</span>
                <span className="shrink-0 text-xs text-zinc-500">{dayText(h.at)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
