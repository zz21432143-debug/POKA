import { cn } from "cn";
import { RARITY_LABEL, yokaiImage } from "@/lib/yokai";
import { profileYokai, yokaiPublic } from "@/lib/yokai-server";

/** 프로필: 대표 요괴 카드(요괴 마을 공개 전에는 보는 사람이 마스터일 때만) */
export async function ProfileYokai({ userId, viewerIsMaster }: { userId: string; viewerIsMaster: boolean }) {
  if (!yokaiPublic() && !viewerIsMaster) return null;
  const y = await profileYokai(userId);
  if (!y) return null;
  const legend = y.rarity === "legend";
  return (
    <section
      aria-label="대표 요괴"
      data-profile-yokai={y.species}
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-black/30 p-3",
        legend ? "border-[#f5d76e] shadow-[0_0_14px_rgba(245,215,110,.35)]" : y.rarity === "hero" ? "border-[#d9dde6]/70" : "border-[#c9a25c]/30",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
      <img src={yokaiImage(y.species, y.stage)} alt="" className="size-20 shrink-0 object-contain" />
      <div className="grid gap-0.5">
        <span className="text-xs font-bold text-[#e7c98a]">대표 요괴 {legend ? "· ✨ 전설" : `· ${RARITY_LABEL[y.rarity]}`}</span>
        <b className="text-lg text-white">{y.stageName}</b>
        <span className="text-xs text-zinc-400">
          {y.name} · {y.stage}단계 · 도감 {y.count}종
        </span>
      </div>
    </section>
  );
}
