import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { YOKAI, yokaiImage } from "@/lib/yokai";
import { yokaiNudge, yokaiPublic } from "@/lib/yokai-server";

/** 홈 · 내정보: 「새 요괴가 찾아왔어요」 · 「○○가 배고파해요」 한 줄(요괴 마을 공개 전에는 마스터만) */
export async function YokaiNudge() {
  const user = await getCurrentUser().catch(() => null);
  if (!user || (!yokaiPublic() && !user.isMaster)) return null;
  const n = await yokaiNudge(user.id).catch(() => null);
  if (!n || (!n.newcomers.length && !n.hungry)) return null;
  const first = n.newcomers[0];
  const text = first
    ? `${n.newcomers.length > 1 ? `새 요괴 ${n.newcomers.length}마리가` : `${YOKAI[first].rarity === "legend" ? "✨ 전설의 " : ""}${YOKAI[first].name}가`} 요괴 마을에 찾아왔어요!`
    : `${n.name}가 배고파해요. 밥을 주러 가 볼까요? 🍙`;
  return (
    <Link
      href="/yokai"
      data-yokai-nudge={first ? "arrival" : "hungry"}
      className="flex min-h-12 items-center gap-2 rounded-2xl border border-[#c9a25c]/50 bg-[#2a1a12] px-3 py-1.5 text-sm font-bold text-[#f3d9a4] hover:border-[#c9a25c]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
      <img src={first ? yokaiImage(first, 1) : yokaiImage(n.species, n.stage)} alt="" className={first ? "size-9 shrink-0 object-contain brightness-0 invert-[.85]" : "size-9 shrink-0 object-contain"} />
      <span className="min-w-0 flex-1">{text}</span>
      <span className="shrink-0 text-xs text-[#c9a25c]">요괴 마을 ›</span>
    </Link>
  );
}
