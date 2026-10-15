import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { safeNextPath } from "@/lib/oauth-consent";
import { getYokai, yokaiPublic } from "@/lib/yokai-server";
import { YokaiVillage } from "@/components/yokai/yokai-village";
import {
  BOND_TIERS,
  FEED,
  RARITY_LABEL,
  STAGE_EXP,
  STARTERS,
  YOKAI,
  YOKAI_ORDER,
  yokaiImage,
} from "@/lib/yokai";

const TITLE = "요괴 마을 — 요괴 키우기 · 25종 도감 · 전설의 구미호와 염라대왕";
const DESCRIPTION =
  "POKA 요괴 마을: 첫 요괴를 골라 밥을 주고 5단계로 진화시켜요. 출석 · 퀴즈 · 글쓰기 같은 활동을 하면 새 요괴가 찾아와요. 전설의 구미호와 염라대왕까지 도감을 채워 보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/yokai" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/yokai",
    images: [{ url: "/images/og/yokai-village-og.jpg", width: 1200, height: 630, alt: "요괴 마을 — 요괴 키우기 · POKA 홀덤 커뮤니티" }],
  },
};
export const dynamic = "force-dynamic";

/** 요괴 마을: 로그인 회원은 키우기 화면, 손님은 소개 + 로그인. 닫아 두면(YOKAI_PUBLIC=0) 마스터만 */
export default async function YokaiPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  // 게임방에서 요괴를 고르러 온 경우: 게임방 링크를 받은 회원은 요괴 마을이 닫혀 있어도 고를 수 있게
  const { next } = await searchParams;
  const returnTo =
    next && next.startsWith("/games") ? safeNextPath(next) : null;
  if (!yokaiPublic() && !user?.isMaster && !(user && returnTo)) notFound();
  if (user)
    return (
      <YokaiVillage initial={await getYokai(user.id)} returnTo={returnTo} />
    );
  return (
    <div className="flex flex-col gap-4" data-yokai-guest>
      <header className="board-intro">
        <h1 className="text-2xl font-black text-[#f3d9a4]">🏮 요괴 마을</h1>
        <p className="mt-2">
          첫 요괴를 골라 밥을 주고 키워 보세요. 출석 · 퀴즈 · 글쓰기 같은 활동을
          하면 새 요괴가 찾아와요.
        </p>
      </header>
      <section className="lounge-card grid gap-3 rounded-[1.35rem] p-4">
        <h2 className="text-lg font-black text-white">
          처음 고를 수 있는 요괴
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {STARTERS.map((s) => (
            <div
              key={s}
              className="grid justify-items-center gap-1 rounded-2xl border border-[#c9a25c]/30 bg-black/30 p-2 text-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
              <img
                src={yokaiImage(s, 1)}
                alt={YOKAI[s].name}
                className="aspect-square w-full max-w-32 object-contain"
              />
              <b className="text-white">{YOKAI[s].name}</b>
              <span className="text-[11px] text-zinc-400">
                → {YOKAI[s].stages[4]}
              </span>
            </div>
          ))}
        </div>
        <Link
          href="/login?next=%2Fyokai"
          className="grid min-h-12 place-items-center rounded-xl bg-[#7a1c22] text-sm font-black text-white hover:bg-[#93242c]"
        >
          로그인하고 요괴 키우기
        </Link>
      </section>
      {/* 비회원 · 검색용 설명: 노는 법 · 진화 · 친밀도 · 요괴마다 만나는 법 */}
      <section data-yokai-howto className="ink-panel grid gap-3 rounded-2xl p-4 text-[15px] leading-7 text-[#D1D5DB]">
        <h2 className="text-lg font-black text-[#f3d9a4]">요괴 마을은 이렇게 놀아요</h2>
        <p>
          요괴 마을은 POKA 회원이 커뮤니티 활동을 하면서 함께 키우는 작은 펫 게임입니다. 처음에는 시작 요괴 {STARTERS.length}마리 중
          하나를 골라 데려오고, 밥을 주고 쓰다듬으며 키웁니다. 홀덤 공부 · 구인 · 글쓰기 같은 활동을 하면 새로운 요괴가 마을로
          찾아와 도감이 채워집니다.
        </p>
        <h3 className="text-base font-black text-white">밥 주기와 진화</h3>
        <p>
          밥을 한 번 주면 경험치 +{FEED.exp}, 포만감 +{FEED.fullness}, 친밀도 +{FEED.affection}이 오릅니다. 포만감은 시간이 지나며
          줄어들어 배가 고프면 다시 밥을 줄 수 있습니다. 경험치가 {STAGE_EXP.slice(1).join(" · ")}에 이르면 한 단계씩 진화해 모두 5단계까지 자랍니다.
          단계마다 모습과 이름이 바뀝니다.
        </p>
        <h3 className="text-base font-black text-white">친밀도</h3>
        <p>
          쓰다듬기와 하루 첫 인사로 친밀도가 오르고, {BOND_TIERS.map((t) => `${t.at} ${t.name}`).join(" → ")} 순으로 관계가 깊어집니다.
          단계에 오를 때마다 포인트 보상이 있습니다.
        </p>
        <h3 className="text-base font-black text-white">요괴 게임방</h3>
        <p>
          키운 요괴는 요괴 게임방의 윷놀이 · 오목에서 내 말과 내 캐릭터가 됩니다. 친구를 방 코드로 불러 한 판 하거나 요괴 AI와 연습할 수 있습니다.
        </p>
      </section>
      <section data-yokai-dex-guide className="ink-panel grid gap-2 rounded-2xl p-4">
        <h2 className="text-lg font-black text-[#f3d9a4]">요괴 {YOKAI_ORDER.length}종 · 만나는 방법</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {YOKAI_ORDER.map((s) => (
            <li key={s} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm leading-6 text-[#D1D5DB]">
              <b className="text-white">{YOKAI[s].name}</b>{" "}
              <span className="text-xs text-[#c9b48a]">
                {RARITY_LABEL[YOKAI[s].rarity]} · {YOKAI[s].element.label}
              </span>
              <p>{YOKAI[s].intro}</p>
              <p className="text-xs text-[#e7c98a]">만나는 법: {YOKAI[s].how}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="ink-panel grid gap-2 rounded-2xl p-4">
        <h2 className="text-base font-black text-[#f3d9a4]">
          요괴 도감 {YOKAI_ORDER.length}종
        </h2>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
          {YOKAI_ORDER.map((s) => (
            <div
              key={s}
              className="grid justify-items-center gap-0.5 text-center text-[10px] text-zinc-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 시작 요괴만 보이고 나머지는 실루엣 */}
              <img
                src={yokaiImage(s, 1)}
                alt=""
                className={
                  YOKAI[s].rarity === "starter"
                    ? "aspect-square w-full object-contain"
                    : "aspect-square w-full object-contain opacity-30 brightness-0"
                }
              />
              <span>{RARITY_LABEL[YOKAI[s].rarity]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
