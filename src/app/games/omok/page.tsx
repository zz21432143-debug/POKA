import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OpponentCard } from "@/components/games/omok-ai";
import { LobbyRefresh, OmokCodeEntry, OmokCreate } from "@/components/games/omok-create";
import { StoneDot } from "@/components/games/omok-board";
import { LobbyTabs, RulesButton } from "@/components/games/lobby-ui";
import { PotTitleBadge } from "@/components/honor/crowned-frame";
import { GameStatsPanel } from "@/components/games/game-stats-panel";
import { getCurrentUser } from "@/lib/current-user";
import { loadWinReward } from "@/lib/game-reward";
import { OMOK_OPPONENTS } from "@/lib/omok-lines";
import { gamesOpen, omokLobby } from "@/lib/omok-server";
import { gameRecord, gameStatsVisible, recordLine, rewardsOn } from "@/lib/game-stats";
import { profileYokai } from "@/lib/yokai-server";
import { yokaiImage } from "@/lib/yokai";

export const metadata: Metadata = {
  title: "요괴 오목",
  robots: { index: false, follow: false },
  openGraph: { title: "요괴 오목", description: "POKA 요괴 게임방: 요괴 AI · 친구 대전 · 관전", url: "/games/omok", images: [{ url: "/images/og/yokai-village-og.jpg", width: 1200, height: 630, alt: "요괴 마을 — 요괴 키우기 · POKA 홀덤 커뮤니티" }], },
};
export const dynamic = "force-dynamic";

const END: Record<string, string> = {
  five: "5목",
  resign: "기권",
  timeout: "시간 초과",
  draw: "무승부",
  "draw-agree": "합의 무승부",
  leave: "퇴장 · 접속 끊김 기권패",
};

/**
 * 요괴 오목 로비(2단 대시보드):
 * 왼쪽 = 타이틀 · 기다리는 방(크게) · 방 만들기 / 코드 입장
 * 오른쪽 = 내 요괴 · 전적 · 요괴 연습 대국 · 탭(랭킹 · 최근 대국 · 대국 중 · 내 기록). 규칙은 팝업.
 */
export default async function OmokLobbyPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpen(user)) notFound();
  const yk = user ? await profileYokai(user.id).catch(() => null) : null;
  if (user && !yk) redirect("/yokai?next=%2Fgames%2Fomok");
  const [{ waiting, live, recent, latest }, mine] = await Promise.all([omokLobby(user?.id ?? null), user ? gameRecord(user.id, "omok").catch(() => null) : Promise.resolve(null)]);
  const WIN_REWARD = await loadWinReward();

  const latestList = latest.length ? (
    <ul data-omok-latest className="grid gap-1.5">
      {latest.map((g) => {
        const draw = !g.winner;
        const win = g.winner === 1 ? g.black : g.white;
        const lose = g.winner === 1 ? g.white : g.black;
        return (
          <li key={g.id}>
            <Link href={`/games/omok/${g.id}`} className="flex min-h-11 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg bg-black/30 px-2.5 py-1 text-sm hover:bg-white/5">
              {draw ? (
                <>
                  <b className="text-white">{g.black}</b>
                  <span className="rounded bg-white/20 px-1 text-[11px] font-black text-white">무</span>
                  <b className="text-white">{g.white}</b>
                </>
              ) : (
                <>
                  <span className="rounded bg-[#ffcf4a] px-1 text-[11px] font-black text-[#2a1400]">승</span>
                  <b className="text-white">{win}</b>
                  <span className="text-[#d6cdee]">vs</span>
                  <span className="rounded bg-[#ff5d6c] px-1 text-[11px] font-black text-white">패</span>
                  <b className="text-white">{lose}</b>
                </>
              )}
              <span className="ml-auto text-[11px] text-[#d6cdee]">
                {END[g.endReason] ?? ""} · {g.moves}수
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="text-sm text-[#d6cdee]">아직 끝난 대국이 없어요.</p>
  );
  const liveList = live.length ? (
    <ul data-omok-live className="grid gap-1.5">
      {live.map((g) => (
        <li key={g.id}>
          <Link href={`/games/omok/${g.id}`} className="flex min-h-11 items-center gap-1.5 rounded-lg bg-black/30 px-2.5 text-sm hover:bg-white/5">
            <b className="min-w-0 max-w-[40%] shrink-0 truncate text-[#ffe08a]">{g.title}</b>
            <StoneDot color={1} />
            <b className="min-w-0 truncate text-white">{g.black}</b>
            <span className="vs-badge text-[9px]">VS</span>
            <StoneDot color={2} />
            <b className="min-w-0 truncate text-white">{g.white}</b>
            <span className="ml-auto shrink-0 text-xs font-bold text-[#8eeaff]">{g.moves}수 · 관전 ›</span>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-[#d6cdee]">지금은 대국 중인 판이 없어요.</p>
  );
  const recentList = recent.length ? (
    <ul className="grid gap-1.5">
      {recent.map((g) => {
        const opp = g.mine === 1 ? g.white : g.black;
        const res = !g.winner ? "무" : g.winner === g.mine ? "승" : "패";
        return (
          <li key={g.id}>
            <Link href={`/games/omok/${g.id}`} className="flex min-h-11 items-center gap-2 rounded-lg bg-black/30 px-2.5 text-sm hover:bg-white/5">
              <span className={`grid size-7 shrink-0 place-items-center rounded-md font-black ${res === "승" ? "bg-[#ffcf4a] text-[#2a1400]" : res === "패" ? "bg-[#ff5d6c] text-white" : "bg-white/20 text-white"}`}>{res}</span>
              <span className="min-w-0 truncate font-bold text-white">vs {opp}</span>
              <span className="ml-auto shrink-0 text-xs text-[#d6cdee]">
                {END[g.endReason] ?? ""} · {g.moves}수
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="text-sm text-[#d6cdee]">{user ? "아직 둔 대국이 없어요." : "로그인하면 내 기록이 보여요."}</p>
  );

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-3 pt-11 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
      {/* ───── 왼쪽: 타이틀 · 기다리는 방 · 방 만들기 ───── */}
      <div className="grid min-w-0 content-start gap-3">
        <header className="arcade-panel flex flex-wrap items-center gap-2.5 px-3 py-2.5">
          <Link href="/games" className="inline-flex min-h-10 items-center text-sm font-black text-[#ffcf4a]">
            ← 게임방
          </Link>
          <div className="grid min-w-0 flex-1">
            <p className="arcade-px neon-purple text-[10px]">POKA ARCADE</p>
            <h1 className="arcade-px neon-gold text-2xl leading-snug sm:text-3xl">YOKAI OMOK</h1>
            <p className="text-sm text-[#d6cdee]">요괴 오목 · 15×15 · 흑 삼삼 금지</p>
          </div>
          <RulesButton title="요괴 오목 규칙">
            <ul className="grid list-disc gap-1.5 pl-5">
              <li>15×15 판 · 흑이 먼저 · 가로 · 세로 · 대각선으로 정확히 5개면 승리(6목 이상은 승리 아님).</li>
              <li>흑만 삼삼(열린 3을 두 개 동시에) 금지. 백은 제한 없어요.</li>
              <li>한 수 60초. 넘기면 시간패예요.</li>
              <li>물리기 · 무승부는 상대가 동의해야 해요. 기권 · 방 나가기 · 접속 끊김(약 15초)은 패배예요.</li>
              <li>판이 끝나면 이긴 사람은 남고, 도전 줄 1번이 바로 앉아요. 진 사람은 줄 맨 뒤로.</li>
              <li>9수 미만의 짧은 판은 전적 · 보상에서 빠져요.</li>
            </ul>
          </RulesButton>
        </header>

        {/* 기다리는 방(크게) */}
        <section aria-label="기다리는 방" data-omok-waiting-list className="grid gap-2 rounded-3xl border-4 border-[#3ddc97] bg-[#0f2a22]/80 p-3 shadow-[0_0_24px_#3ddc9755]">
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
                  <Link href={`/games/omok/${g.id}`} data-omok-waiting-room className="grid gap-1 rounded-2xl border-2 border-[#3ddc97]/60 bg-black/40 p-2.5 transition hover:bg-[#3ddc97]/10">
                    <span className="flex items-center gap-2">
                      <b className="min-w-0 flex-1 truncate text-lg font-black text-white">{g.title}</b>
                      <span className="arcade-px shrink-0 text-xs tracking-widest text-[#ffcf4a]">{g.code}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-sm text-[#d6cdee]">
                      👑 <b className="text-white">{g.host}</b>
                      <PotTitleBadge nickname={g.host} max={1} />
                      {g.guest ? (
                        <>
                          <span>vs</span> <b className="text-white">{g.guest}</b>
                        </>
                      ) : null}
                    </span>
                    <span className={`grid min-h-11 place-items-center rounded-xl text-base font-black ${g.guest ? "bg-white/10 text-[#8eeaff]" : "bg-[#3ddc97] text-[#062a1b]"}`}>{g.guest ? "2/2 · 👀 관전 · 도전 줄" : "1/2 · ⚔️ 들어가서 대결!"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base font-bold text-[#c9f5e3]">지금 기다리는 방이 없어요. 아래에서 방을 만들어 친구를 불러 보세요!</p>
          )}
        </section>

        {/* 방 만들기 · 코드 입장(빠른 실행) */}
        <section id="lobby-create" aria-label="방 만들기" className="arcade-panel grid scroll-mt-24 gap-3 p-3 md:grid-cols-2">
          <div className="grid content-start gap-2">
            <h2 className="text-xl font-black text-white">⚔️ 방 만들기</h2>
            {user ? (
              <OmokCreate />
            ) : (
              <Link href="/login?next=/games/omok" className="arcade-btn btn-main grid min-h-14 place-items-center text-xl">
                로그인하고 방 만들기
              </Link>
            )}
          </div>
          <div id="lobby-code" className="grid scroll-mt-24 content-start gap-2 md:border-l md:border-white/10 md:pl-4">
            <OmokCodeEntry />
            {rewardsOn() ? (
              <p data-omok-reward className="rounded-xl bg-[#ffcf4a]/15 px-3 py-1.5 text-sm font-black text-[#ffcf4a]">
                🎁 이기면 +{WIN_REWARD.points}P · EXP {WIN_REWARD.exp} · 요괴 친밀도 +{WIN_REWARD.affection}
                <span className="block text-xs font-bold text-[#d6cdee]">
                  하루 {WIN_REWARD.perDay}판 · 같은 상대 {WIN_REWARD.perOpponentPerDay}판까지
                </span>
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {/* ───── 오른쪽: 내 요괴 · 연습 · 기록 탭 ───── */}
      <div className="grid min-w-0 content-start gap-3">
        <section aria-label="내 요괴" className="arcade-panel flex items-center gap-3 p-3">
          {yk ? (
            <>
              <span className="hud-portrait size-16 shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- 내 대표 요괴 */}
                <img src={yokaiImage(yk.species, yk.stage)} alt="" className="arcade-bob size-full object-contain" draggable={false} />
              </span>
              <div className="grid min-w-0 gap-0.5">
                <b className="truncate text-lg font-black text-white">{user?.nickname}</b>
                <span className="flex flex-wrap gap-1 empty:hidden">{user ? <PotTitleBadge nickname={user.nickname} max={2} yokai={false} /> : null}</span>
                <span className="text-xs font-bold text-[#d6cdee]">
                  {yk.name}({yk.stageName})
                </span>
                {mine ? (
                  <span data-omok-my-record className="text-base font-black text-[#ffcf4a]">
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

        <section aria-label="요괴와 연습 대국" className="arcade-panel grid gap-1.5 p-2.5">
          <h2 className="text-lg font-black text-white">👹 AI 연습 대국</h2>
          <p className="text-xs text-[#d6cdee]">혼자서 요괴 AI와 둬요(전적에는 안 들어가요).</p>
          <div className="grid grid-cols-2 gap-2">
            {OMOK_OPPONENTS.map((o, i) => (
              <OpponentCard key={o.species} index={i} href={`/games/omok/ai?vs=${i}`} />
            ))}
          </div>
        </section>

        <LobbyTabs
          tabs={[
            ...(gameStatsVisible() ? [{ key: "rank", label: "🏆 랭킹", content: <GameStatsPanel game="omok" userId={user?.id ?? null} /> }] : []),
            { key: "latest", label: "🏁 최근 5판", content: latestList },
            { key: "live", label: `👀 대국 중 ${live.length}`, content: liveList },
            { key: "mine", label: "📜 내 기록", content: recentList },
          ]}
        />
      </div>

      {/* 휴대폰: 아래 고정 바(방 만들기 · 코드 입장) */}
      <div className="h-20 lg:hidden" aria-hidden />
      <nav data-lobby-bottom-bar aria-label="빠른 실행" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t-4 border-[#ffcf4a] bg-[#140d24]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <a href="#lobby-create" className="arcade-btn btn-main grid min-h-14 place-items-center text-lg">
          ⚔️ 방 만들기
        </a>
        <a href="#lobby-code" className="arcade-btn btn-gold grid min-h-14 place-items-center text-lg">
          🔑 코드 입장
        </a>
      </nav>
    </div>
  );
}
