import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LobbyRefresh } from "@/components/games/omok-create";
import { YutCodeEntry, YutCreate } from "@/components/games/yut-create";
import { GameStatsPanel } from "@/components/games/game-stats-panel";
import { PotTitleBadge } from "@/components/honor/crowned-frame";
import { getCurrentUser } from "@/lib/current-user";
import { WIN_REWARD, gameRecord, gameStatsVisible, recordLine, rewardsOn } from "@/lib/game-stats";
import { gamesOpenYut, yutLobby } from "@/lib/yut-server";
import { profileYokai } from "@/lib/yokai-server";
import { yokaiImage } from "@/lib/yokai";

export const metadata: Metadata = { title: "요괴 윷놀이", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TEAM = { A: { name: "홍팀", color: "#ff5d6c" }, B: { name: "청팀", color: "#4aa8ff" } } as const;

/** 요괴 윷놀이 로비: 방 만들기(1:1~4:4) · 초대 코드 · 기다리는 방 · 진행 중 · 최근 5판 · 전적 · 랭킹 */
export default async function YutLobbyPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpenYut(user)) notFound();
  const yk = user ? await profileYokai(user.id).catch(() => null) : null;
  if (user && !yk) redirect("/yokai?next=%2Fgames%2Fyut");
  const [{ waiting, live, latest }, mine] = await Promise.all([yutLobby(), user ? gameRecord(user.id, "yut").catch(() => null) : Promise.resolve(null)]);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link href="/games" className="inline-flex min-h-10 w-fit items-center text-sm font-black text-[#ffcf4a]">
        ← 요괴 게임방
      </Link>

      <header className="arcade-panel grid justify-items-center gap-2 px-4 py-6 text-center">
        <p className="arcade-px neon-purple text-xs">POKA ARCADE</p>
        <h1 className="arcade-px neon-gold text-3xl leading-snug sm:text-4xl">YOKAI YUT</h1>
        <p className="arcade-kr text-2xl text-white">요괴 윷놀이</p>
        <p className="text-base text-[#d6cdee]">홍팀 vs 청팀 · 1:1 ~ 4:4 · 내 대표 요괴가 말이 돼요</p>
      </header>

      {/* 기다리는 방: 로비 맨 위에 크게 */}
      <section aria-label="기다리는 방" data-yut-waiting-list className="grid gap-3 rounded-3xl border-4 border-[#3ddc97] bg-[#0f2a22]/80 p-4 shadow-[0_0_24px_#3ddc9755]">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-[#3ddc97]">
            🏮 기다리는 방 <span className="rounded-full bg-[#3ddc97] px-2.5 text-lg text-[#062a1b]">{waiting.length}</span>
          </h2>
          <LobbyRefresh />
        </div>
        {waiting.length ? (
          <ul className="grid gap-2">
            {waiting.map((g) => (
              <li key={g.id}>
                <Link href={`/games/yut/${g.id}`} data-yut-waiting-room className="grid gap-1.5 rounded-2xl border-2 border-[#3ddc97]/60 bg-black/40 p-3 transition hover:bg-[#3ddc97]/10">
                  <span className="flex items-center gap-2">
                    <b className="min-w-0 flex-1 truncate text-lg font-black text-white">{g.title}</b>
                    <span className="g-chip shrink-0 !text-white">
                      {g.mode}:{g.mode}
                    </span>
                    <span className="arcade-px shrink-0 text-xs tracking-widest text-[#ffcf4a]">{g.code}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-sm text-[#d6cdee]">
                    👑 <b className="text-white">{g.host}</b>
                    <PotTitleBadge nickname={g.host} max={1} />
                  </span>
                  <span className={`grid min-h-11 place-items-center rounded-xl text-base font-black ${g.filled < g.total ? "bg-[#3ddc97] text-[#062a1b]" : "bg-white/10 text-[#8eeaff]"}`}>
                    {g.filled}/{g.total} · {g.filled < g.total ? "🎲 들어가서 앉기!" : "👀 관전하기"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base font-bold text-[#c9f5e3]">지금 기다리는 방이 없어요. 아래에서 방을 만들어 친구를 불러 보세요!</p>
        )}
      </section>

      <section aria-label="방 만들기" className="arcade-panel grid gap-4 p-4">
        {yk ? (
          <div className="flex items-center gap-3">
            <span className="hud-portrait size-20 shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- 내 대표 요괴(말) */}
              <img src={yokaiImage(yk.species, yk.stage)} alt="" className="arcade-bob size-full object-contain" draggable={false} />
            </span>
            <div className="grid min-w-0 gap-1">
              <b className="truncate text-lg font-black text-white">{user?.nickname}</b>
              <span className="text-sm font-bold text-[#d6cdee]">
                내 말 · {yk.name}({yk.stageName})
              </span>
              {mine ? (
                <span data-yut-my-record className="text-base font-black text-[#ffcf4a]">
                  {recordLine(mine)}
                  {mine.games ? <span className="ml-1.5 text-sm text-[#d6cdee]">승률 {mine.rate}%</span> : null}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="grid gap-1">
          <h2 className="arcade-kr text-2xl text-white">🎲 방 만들기</h2>
          <p className="text-base text-[#d6cdee]">인원을 고르고 방을 만든 뒤 초대 코드 · 링크를 보내세요. 홍팀 · 청팀 자리에 앉아 모두 READY면 방장이 시작!</p>
          {rewardsOn() ? (
            <p data-yut-reward-note className="mt-1 w-fit rounded-xl bg-[#ffcf4a]/15 px-3 py-1.5 text-sm font-black text-[#ffcf4a]">
              🎁 이긴 팀 모두 +{WIN_REWARD.points}P · EXP {WIN_REWARD.exp} · 요괴 친밀도 +{WIN_REWARD.affection} (하루 {WIN_REWARD.perDay}판 · 같은 멤버 {WIN_REWARD.perOpponentPerDay}판 · 봇 판 제외)
            </p>
          ) : null}
        </div>
        {user ? (
          <YutCreate />
        ) : (
          <Link href="/login?next=/games/yut" className="arcade-btn btn-main grid min-h-14 place-items-center text-xl">
            로그인하고 방 만들기
          </Link>
        )}
        <div className="border-t border-white/10 pt-3">
          <YutCodeEntry />
        </div>
      </section>

      {gameStatsVisible() ? <GameStatsPanel game="yut" userId={user?.id ?? null} /> : null}


      <section aria-label="지금 노는 중" className="arcade-panel grid gap-2 p-4">
        <h2 className="arcade-kr text-xl text-white">👀 지금 노는 중</h2>
        {live.length ? (
          <ul className="grid gap-2">
            {live.map((g) => (
              <li key={g.id}>
                <Link href={`/games/yut/${g.id}`} className="flex min-h-14 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl bg-black/30 px-3 py-1.5 text-base hover:bg-white/5">
                  <span className="g-chip !text-white">
                    {g.mode}:{g.mode}
                  </span>
                  <b style={{ color: TEAM.A.color }}>{g.teamA.join(" · ")}</b>
                  <span className="vs-badge text-[10px]">VS</span>
                  <b style={{ color: TEAM.B.color }}>{g.teamB.join(" · ")}</b>
                  <span className="ml-auto shrink-0 text-sm font-bold text-[#8eeaff]">관전 ›</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-[#d6cdee]">지금은 진행 중인 판이 없어요.</p>
        )}
      </section>

      {latest.length ? (
        <section aria-label="최근 판" data-yut-latest className="arcade-panel grid gap-2 p-4">
          <h2 className="arcade-kr text-xl text-white">🏁 최근 5판</h2>
          <ul className="grid gap-2">
            {latest.map((g) => {
              const w = g.winner === "B" ? "B" : "A";
              const l = w === "A" ? "B" : "A";
              return (
                <li key={g.id}>
                  <Link href={`/games/yut/${g.id}`} className="flex min-h-12 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl bg-black/30 px-3 py-1.5 text-base hover:bg-white/5">
                    <span className="rounded-md bg-[#ffcf4a] px-1.5 text-xs font-black text-[#2a1400]">승</span>
                    <b style={{ color: TEAM[w].color }}>{(w === "A" ? g.teamA : g.teamB).join(" · ")}</b>
                    <span className="text-[#d6cdee]">vs</span>
                    <span className="rounded-md bg-[#ff5d6c] px-1.5 text-xs font-black text-white">패</span>
                    <b style={{ color: TEAM[l].color }}>{(l === "A" ? g.teamA : g.teamB).join(" · ")}</b>
                    <span className="ml-auto text-xs text-[#d6cdee]">
                      {g.mode}:{g.mode}
                      {g.withBots ? " · 봇" : ""} ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-label="규칙" className="arcade-panel grid gap-2 p-4 text-base text-[#d6cdee]">
        <h2 className="arcade-kr text-xl text-white">📜 규칙</h2>
        <ul className="grid list-disc gap-1 pl-5">
          <li>
            도 1 · 개 2 · 걸 3 · 윷 4 · 모 5칸. 점 찍힌 막대 하나만 뒤집히면 <b className="text-white">빽도</b>(1칸 뒤로).
          </li>
          <li>
            가끔 윷가락이 판 밖으로 떨어지면 <b className="text-white">낙</b> — 그 던지기는 없던 일이에요.
          </li>
          <li>던지기 버튼을 누르면 세기 게이지가 출렁여요. 세게 · 살살 던지는 맛만 다르고 결과는 운이에요.</li>
          <li>윷 · 모가 나오거나 상대 말을 잡으면 한 번 더 던져요.</li>
          <li>꼭짓점 · 가운데(방)에 멈추면 지름길로 들어가요.</li>
          <li>우리 팀 말이 있는 칸에 가면 업혀서 함께 움직여요(탑).</li>
          <li>팀원이 번갈아 던지고 말은 팀이 같이 써요. 1:1 · 2:2는 말 4개, 3:3 · 4:4는 3개.</li>
          <li>한 동작 10초. 시간이 지나거나 나가면 요괴 AI가 대신 던지고 옮겨요.</li>
          <li>혼자서는 못 해요. 홍팀 · 청팀에 사람이 한 명 이상씩 있어야 시작할 수 있어요(빈자리는 요괴봇 가능).</li>
        </ul>
      </section>
    </div>
  );
}
