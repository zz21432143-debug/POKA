import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getYokai, yokaiPublic } from "@/lib/yokai-server";
import { YokaiVillage } from "@/components/yokai/yokai-village";
import { RARITY_LABEL, STARTERS, YOKAI, YOKAI_ORDER, yokaiImage } from "@/lib/yokai";

const TITLE = "요괴 마을 — 요괴 키우기 · 25종 도감 · 전설의 구미호와 염라대왕";
const DESCRIPTION = "POKA 요괴 마을: 첫 요괴를 골라 밥을 주고 5단계로 진화시켜요. 출석 · 퀴즈 · 글쓰기 같은 활동을 하면 새 요괴가 찾아와요. 전설의 구미호와 염라대왕까지 도감을 채워 보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/yokai" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/yokai", images: ["/yokai/gumiho-5.webp"] },
};
export const dynamic = "force-dynamic";

/** 요괴 마을: 로그인 회원은 키우기 화면, 손님은 소개 + 로그인. 닫아 두면(YOKAI_PUBLIC=0) 마스터만 */
export default async function YokaiPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!yokaiPublic() && !user?.isMaster) notFound();
  if (user) return <YokaiVillage initial={await getYokai(user.id)} />;
  return (
    <div className="flex flex-col gap-4" data-yokai-guest>
      <header className="board-intro">
        <h1 className="text-2xl font-black text-[#f3d9a4]">🏮 요괴 마을</h1>
        <p className="mt-2">첫 요괴를 골라 밥을 주고 키워 보세요. 출석 · 퀴즈 · 글쓰기 같은 활동을 하면 새 요괴가 찾아와요.</p>
      </header>
      <section className="lounge-card grid gap-3 rounded-[1.35rem] p-4">
        <h2 className="text-lg font-black text-white">처음 고를 수 있는 요괴</h2>
        <div className="grid grid-cols-3 gap-2">
          {STARTERS.map((s) => (
            <div key={s} className="grid justify-items-center gap-1 rounded-2xl border border-[#c9a25c]/30 bg-black/30 p-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
              <img src={yokaiImage(s, 1)} alt={YOKAI[s].name} className="aspect-square w-full max-w-32 object-contain" />
              <b className="text-white">{YOKAI[s].name}</b>
              <span className="text-[11px] text-zinc-400">→ {YOKAI[s].stages[4]}</span>
            </div>
          ))}
        </div>
        <Link href="/login?next=%2Fyokai" className="grid min-h-12 place-items-center rounded-xl bg-[#7a1c22] text-sm font-black text-white hover:bg-[#93242c]">
          로그인하고 요괴 키우기
        </Link>
      </section>
      <section className="ink-panel grid gap-2 rounded-2xl p-4">
        <h2 className="text-base font-black text-[#f3d9a4]">요괴 도감 {YOKAI_ORDER.length}종</h2>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
          {YOKAI_ORDER.map((s) => (
            <div key={s} className="grid justify-items-center gap-0.5 text-center text-[10px] text-zinc-400">
              {/* eslint-disable-next-line @next/next/no-img-element -- 시작 요괴만 보이고 나머지는 실루엣 */}
              <img src={yokaiImage(s, 1)} alt="" className={YOKAI[s].rarity === "starter" ? "aspect-square w-full object-contain" : "aspect-square w-full object-contain opacity-30 brightness-0"} />
              <span>{RARITY_LABEL[YOKAI[s].rarity]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
