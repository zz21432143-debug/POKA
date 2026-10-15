import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LobbyRefresh } from "@/components/games/omok-create";
import { YutCodeEntry, YutCreate } from "@/components/games/yut-create";
import { GameStatsPanel } from "@/components/games/game-stats-panel";
import { LobbyTabs, RulesButton } from "@/components/games/lobby-ui";
import { PotTitleBadge } from "@/components/honor/crowned-frame";
import { getCurrentUser } from "@/lib/current-user";
import { loadWinReward } from "@/lib/game-reward";
import { gameRecord, gameStatsVisible, recordLine, rewardsOn } from "@/lib/game-stats";
import { gamesOpenYut, yutLobby } from "@/lib/yut-server";
import { profileYokai } from "@/lib/yokai-server";
import { yokaiImage } from "@/lib/yokai";

export const metadata: Metadata = { title: "요괴 윷놀이", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TEAM = { A: { name: "홍팀", color: "#ff5d6c" }, B: { name: "청팀", color: "#4aa8ff" } } as const;

/**
 * 요괴 윷놀이 로비(2단 대시보드):
 * 왼쪽 = 타이틀 · 기다리는 방(크게) · 방 만들기 / 초대 코드
 * 오른쪽 = 내 요괴 · 전적 · 탭(랭킹 · 최근 5판 · 진행 중). 규칙은 팝업.
 */
export default async function YutLobbyPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpenYut(user)) notFound();
  const yk = user ? await profileYokai(user.id).catch(() => null) : null;
  if (user && !yk) redirect("/yokai?next=%2Fgames%2Fyut");
  const [{ waiting, live, latest }, mine] = await Promise.all([yutLobby(), user ? gameRecord(user.id, "yut").catch(() => null) : Promise.resolve(null)]);
  const WIN_REWARD = await loadWinReward();

  const latestList = latest.length ? (
    <ul data-yut-latest className="grid gap-1.5">
      {latest.map((g) => {
        const w = g.winner === "B" ? "B" : "A";
        const l = w === "A" ? "B" : "A";
        return (
          <li key={g.id}>
            <Link href={`/games/yut/${g.id}`} className="flex min-h-11 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg bg-black/30 px-2.5 py-1 text-sm hover:bg-white/5">
              <span className="rounded bg-[#ffcf4a] px-1 text-[11px] font-black text-[#2a1400]">승</span>
              <b style={{ color: TEAM[w].color }}>{(w === "A" ? g.teamA : g.teamB).join(" · ")}</b>
              <span className="text-[#d6cdee]">vs</span>
              <b style={{ color: TEAM[l].color }}>{(l === "A" ? g.teamA : g.teamB).join(" · ")}</b>
              <span className="ml-auto text-[11px] text-[#d6cdee]">
                {g.mode}:{g.mode}
                {g.withBots ? " · 봇" : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="text-sm text-[#d6cdee]">아직 끝난 판이 없어요.</p>
  );
  const liveList = live.length ? (
    <ul className="grid gap-1.5">
      {live.map((g) => (
        <li key={g.id}>
          <Link href={`/games/yut/${g.id}`} className="flex min-h-11 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg bg-black/30 px-2.5 py-1 text-sm hover:bg-white/5">
            <span className="g-chip !text-white">
              {g.mode}:{g.mode}
            </span>
            <b style={{ color: TEAM.A.color }}>{g.teamA.join(" · ")}</b>
            <span className="vs-badge text-[9px]">VS</span>
            <b style={{ color: TEAM.B.color }}>{g.teamB.join(" · ")}</b>
            <span className="ml-auto shrink-0 text-xs font-bold text-[#8eeaff]">관전 ›</span>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-[#d6cdee]">지금은 진행 중인 판이 없어요.</p>
  );

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-4 pt-12 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
      {/* ───── 왼쪽 ───── */}
      <div className="grid min-w-0 content-start gap-4">
        <header className="arcade-panel flex flex-wrap items-center gap-3 px-4 py-4">
          <Link href="/games" className="inline-flex min-h-10 items-center text-sm font-black text-[#ffcf4a]">
            ← 게임방
          </Link>
          <div className="grid min-w-0 flex-1">
            <p className="arcade-px neon-purple text-[10px]">POKA ARCADE</p>
            <h1 className="arcade-px neon-gold text-2xl leading-snug sm:text-3xl">YOKAI YUT</h1>
            <p className="text-sm text-[#d6cdee]">요괴 윷놀이 · 홍팀 vs 청팀 · 1:1 ~ 4:4</p>
          </div>
          <RulesButton title="요괴 윷놀이 규칙">
            <ul className="grid list-disc gap-1.5 pl-5">
              <li>
                도 1 · 개 2 · 걸 3 · 윷 4 · 모 5칸. 점 찍힌 막대 하나만 뒤집히면 <b className="text-white">빽도</b>(1칸 뒤로).
              </li>
              <li>
                가끔 윷가락이 판 밖으로 떨어지면 <b className="text-white">낙</b> — 그 던지기는 없던 일이에요.
              </li>
              <li>윷 · 모가 나오거나 상대 말을 잡으면 한 번 더 던져요.</li>
              <li>꼭짓점 · 가운데(방)에 멈추면 지름길로 들어가요.</li>
              <li>우리 팀 말이 있는 칸에 가면 업혀서 함께 움직여요(탑).</li>
              <li>팀원이 번갈아 던지고 말은 팀이 같이 써요. 1:1 · 2:2는 말 4개, 3:3 · 4:4는 3개.</li>
              <li>한 동작 10초. 시간이 지나면 요괴 AI가 대신 해요. 스페이스바로 바로 던질 수 있어요.</li>
              <li>기권: 혼자 팀이면 바로, 팀이면 모두 동의해야 패배. 1:1에서 접속이 끊기면(약 15초) 기권패, 팀전은 AI가 이어서 해요.</li>
              <li>판이 끝나면 이긴 팀은 남고, 진 팀 자리는 도전 줄 사람이 앉아요(진 사람은 줄 맨 뒤).</li>
              <li>혼자서는 못 해요. 홍팀 · 청팀에 사람이 한 명 이상씩 있어야 시작(빈자리는 요괴봇 가능 · 봇 판은 전적 없음).</li>
            </ul>
          </RulesButton>
        </header>

        <section aria-label="기다리는 방" data-yut-waiting-list className="grid gap-3 rounded-3xl border-4 border-[#3ddc97] bg-[#0f2a22]/80 p-4 shadow-[0_0_24px_#3ddc9755]">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-[#3ddc97]">
              🏮 기다리는 방 <span className="rounded-full bg-[#3ddc97] px-2.5 text-lg text-[#062a1b]">{waiting.length}</span>
            </h2>
            <LobbyRefresh />
          </div>
          {waiting.length ? (
            <ul className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0">
              {waiting.map((g) => (
                <li key={g.id} className="w-[86%] shrink-0 snap-start md:w-auto">
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
                      {g.filled}/{g.total} · {g.filled < g.total ? "🎲 들어가서 앉기!" : "👀 관전 · 도전 줄"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base font-bold text-[#c9f5e3]">지금 기다리는 방이 없어요. 아래에서 방을 만들어 친구를 불러 보세요!</p>
          )}
        </section>

        <section id="lobby-create" aria-label="방 만들기" className="arcade-panel grid scroll-mt-24 gap-4 p-4 md:grid-cols-2">
          <div className="grid content-start gap-2">
            <h2 className="text-xl font-black text-white">🎲 방 만들기</h2>
            {user ? (
              <YutCreate />
            ) : (
              <Link href="/login?next=/games/yut" className="arcade-btn btn-main grid min-h-14 place-items-center text-xl">
                로그인하고 방 만들기
              </Link>
            )}
          </div>
          <div id="lobby-code" className="grid scroll-mt-24 content-start gap-2 md:border-l md:border-white/10 md:pl-4">
            <YutCodeEntry />
            {rewardsOn() ? (
              <p data-yut-reward-note className="rounded-xl bg-[#ffcf4a]/15 px-3 py-1.5 text-sm font-black text-[#ffcf4a]">
                🎁 이긴 팀 모두 +{WIN_REWARD.points}P · EXP {WIN_REWARD.exp} · 요괴 친밀도 +{WIN_REWARD.affection}
                <span className="block text-xs font-bold text-[#d6cdee]">
                  하루 {WIN_REWARD.perDay}판 · 같은 멤버 {WIN_REWARD.perOpponentPerDay}판 · 봇 판 제외
                </span>
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {/* ───── 오른쪽 ───── */}
      <div className="grid min-w-0 content-start gap-4">
        <section aria-label="내 요괴" className="arcade-panel flex items-center gap-3 p-3">
          {yk ? (
            <>
              <span className="hud-portrait size-16 shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- 내 대표 요괴(말) */}
                <img src={yokaiImage(yk.species, yk.stage)} alt="" className="arcade-bob size-full object-contain" draggable={false} />
              </span>
              <div className="grid min-w-0 gap-0.5">
                <b className="truncate text-lg font-black text-white">{user?.nickname}</b>
                <span className="flex flex-wrap gap-1 empty:hidden">{user ? <PotTitleBadge nickname={user.nickname} max={2} yokai={false} /> : null}</span>
                <span className="text-xs font-bold text-[#d6cdee]">
                  내 말 · {yk.name}({yk.stageName})
                </span>
                {mine ? (
                  <span data-yut-my-record className="text-base font-black text-[#ffcf4a]">
                    {recordLine(mine)}
                    {mine.games ? <span className="ml-1.5 text-xs text-[#d6cdee]">승률 {mine.rate}%</span> : null}
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-[#d6cdee]">로그인하면 내 요괴와 전적이 보여요.</p>
          )}
        </section>

        <section aria-label="1위 칭호" className="arcade-panel grid gap-1 p-3 text-sm text-[#d6cdee]">
          <h2 className="text-base font-black text-white">🏆 이달의 1위 칭호</h2>
          <p>
            이번 달 윷놀이 랭킹 <b className="text-[#ffcf4a]">1위</b>에게만 「🎲 윷놀이 요괴」 칭호가 붙어요. 게임 화면에서도 닉네임 위에 금빛 배지로 보여요.
          </p>
        </section>

        <LobbyTabs
          tabs={[
            ...(gameStatsVisible() ? [{ key: "rank", label: "🏆 랭킹", content: <GameStatsPanel game="yut" userId={user?.id ?? null} /> }] : []),
            { key: "latest", label: "🏁 최근 5판", content: latestList },
            { key: "live", label: `👀 진행 중 ${live.length}`, content: liveList },
          ]}
        />
      </div>

      {/* 휴대폰: 아래 고정 바(방 만들기 · 코드 입장) */}
      <div className="h-20 lg:hidden" aria-hidden />
      <nav data-lobby-bottom-bar aria-label="빠른 실행" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t-4 border-[#ffcf4a] bg-[#140d24]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <a href="#lobby-create" className="arcade-btn btn-main grid min-h-14 place-items-center text-lg">
          🎲 방 만들기
        </a>
        <a href="#lobby-code" className="arcade-btn btn-gold grid min-h-14 place-items-center text-lg">
          🔑 코드 입장
        </a>
      </nav>
    </div>
  );
}
