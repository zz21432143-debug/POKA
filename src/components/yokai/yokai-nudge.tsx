import Link from "@/components/ui/link";
import { getCurrentUser } from "@/lib/current-user";
import { STARTERS, YOKAI, yokaiImage } from "@/lib/yokai";
import { yokaiNudge, yokaiPublic } from "@/lib/yokai-server";
import { YokaiInvite } from "@/components/yokai/yokai-invite";

const linkClass = "flex min-h-12 items-center gap-2 rounded-2xl border border-[#c9a25c]/50 bg-[#2a1a12] px-3 py-1.5 text-sm font-bold text-[#f3d9a4] hover:border-[#c9a25c]";

/** 홈 · 내정보: 「새 요괴가 찾아왔어요」 · 「○○가 배고파해요」 · (요괴가 없으면) 「요괴 마을이 열렸어요」 한 줄 */
export async function YokaiNudge() {
  const user = await getCurrentUser().catch(() => null);
  if (!user || (!yokaiPublic() && !user.isMaster)) return null;
  const n = await yokaiNudge(user.id).catch(() => null);
  if (!n) return null;
  if (n.invite) {
    return (
      <YokaiInvite>
        <Link href="/yokai" data-yokai-nudge="invite" className={linkClass}>
          <span className="flex shrink-0 -space-x-3">
            {STARTERS.map((s) => (
              // eslint-disable-next-line @next/next/no-img-element -- 도트 그림
              <img key={s} src={yokaiImage(s, 1)} alt="" className="size-9 object-contain" />
            ))}
          </span>
          <span className="min-w-0 flex-1">🏮 요괴 마을이 열렸어요! 첫 요괴를 골라 키워 보세요</span>
          <span className="shrink-0 text-xs text-[#c9a25c]">시작 ›</span>
        </Link>
      </YokaiInvite>
    );
  }
  if (!n.newcomers.length && !n.hungry && !n.dirty) return null;
  const first = n.newcomers[0];
  const text = first
    ? `${n.newcomers.length > 1 ? `새 요괴 ${n.newcomers.length}마리가` : `${YOKAI[first].rarity === "legend" ? "✨ 전설의 " : ""}${YOKAI[first].name}가`} 요괴 마을에 찾아왔어요!`
    : n.hungry
      ? `${n.name}가 배고파해요. 밥을 주러 가 볼까요? 🍙`
      : `${n.name}가 꼬질꼬질해요. 샤워시켜 줄까요? 🛁`;
  return (
    <Link href="/yokai" data-yokai-nudge={first ? "arrival" : n.hungry ? "hungry" : "dirty"} className={linkClass}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림(새 요괴는 실루엣) */}
      <img src={first ? yokaiImage(first, 1) : yokaiImage(n.species, n.stage)} alt="" className={first ? "size-9 shrink-0 object-contain brightness-0 invert-[.85]" : "size-9 shrink-0 object-contain"} />
      <span className="min-w-0 flex-1">{text}</span>
      <span className="shrink-0 text-xs text-[#c9a25c]">요괴 마을 ›</span>
    </Link>
  );
}
