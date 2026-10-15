"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { RARITY_LABEL, STARTERS, YOKAI, YOKAI_BACKGROUNDS, YOKAI_ORDER, waitText, yokaiImage, type YokaiBackground, type YokaiRarity, type YokaiSpecies } from "@/lib/yokai";
import type { YokaiView } from "@/lib/yokai-server";
import { PushAlertToggle } from "@/components/quiz/quiz-alert-toggle";

const TONE: Record<string, string> = {
  fire: "bg-[#5a1a14] text-[#ffb199]",
  water: "bg-[#12305a] text-[#9cc7ff]",
  illusion: "bg-[#3a1430] text-[#ffb3dc]",
  thunder: "bg-[#4a4210] text-[#fff09a]",
  wind: "bg-[#123c4a] text-[#9ce8ff]",
  dark: "bg-[#2a1a4a] text-[#cbb3ff]",
  nature: "bg-[#173d17] text-[#a8f0a0]",
  metal: "bg-[#33363d] text-[#d6dbe4]",
  ice: "bg-[#1b3a52] text-[#c9ecff]",
  seer: "bg-[#0f3d3a] text-[#8ff0e2]",
  gold: "bg-[#4a3a10] text-[#ffe08a]",
  blood: "bg-[#4a0f1a] text-[#ff9aa8]",
  light: "bg-[#4a3410] text-[#ffd98a]",
  seal: "bg-[#3d2a16] text-[#f0c890]",
  earth: "bg-[#3a3326] text-[#e0d2b0]",
  sky: "bg-[#1c1f2e] text-[#e6e9ff]",
  justice: "bg-[#173f3a] text-[#a6f2dc]",
  guard: "bg-[#2a2440] text-[#d8ccff]",
  might: "bg-[#331a47] text-[#dcb8ff]",
  underworld: "bg-[#1a1414] text-[#f2f2f2]",
};

/** 도감 칸 테두리: 영웅 = 은테, 전설 = 금테 + 반짝임 */
const FRAME: Record<YokaiRarity, string> = {
  starter: "border-[#c9a25c]/20",
  common: "border-[#c9a25c]/20",
  rare: "border-sky-300/30",
  hero: "border-2 border-[#d9dde6]/70 shadow-[0_0_10px_rgba(217,221,230,.25)]",
  legend: "yk-legend border-2 border-[#f5d76e] shadow-[0_0_14px_rgba(245,215,110,.45)]",
};
const RARITY_TEXT: Record<YokaiRarity, string> = {
  starter: "text-zinc-400",
  common: "text-zinc-400",
  rare: "text-sky-300",
  hero: "text-[#e6e9f2]",
  legend: "text-[#f5d76e]",
};

/** 키우는 화면 · 등장 화면 배경: 전설은 전용(구미호 보름달 · 염라 업경대), 산 배경이 있으면 그것, 영웅은 은빛 */
function stageBackground(species: YokaiSpecies, bg: YokaiBackground = "default") {
  if (species === "gumiho") return "radial-gradient(circle at 50% 42%, rgba(255,226,140,.55) 0 22%, rgba(255,226,140,.12) 34%, transparent 52%), radial-gradient(circle at 20% 80%, rgba(90,170,255,.25), transparent 40%), linear-gradient(#1b1630, #0b0814)";
  if (species === "yeomra") return "radial-gradient(circle at 50% 42%, transparent 0 20%, rgba(245,215,110,.6) 21% 23%, rgba(245,215,110,.12) 24% 36%, transparent 48%), radial-gradient(circle at 50% 100%, rgba(255,255,255,.18), transparent 50%), linear-gradient(#1a0f0f, #050303)";
  if (bg !== "default") return YOKAI_BACKGROUNDS[bg].css;
  if (YOKAI[species].rarity === "hero") return "radial-gradient(circle at 50% 55%, rgba(220,226,240,.25), transparent 58%), linear-gradient(#1a1c24, #0b0c10)";
  return "radial-gradient(circle at 50% 70%, rgba(201,162,92,.18), transparent 60%), linear-gradient(#22150f, #0d0907)";
}

function ElementTag({ species }: { species: YokaiSpecies }) {
  const el = YOKAI[species].element;
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-black", TONE[el.tone])}>{el.label}</span>;
}

function Bar({ label, value, max, color, right }: { label: string; value: number; max: number; color: string; right?: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="tabular-nums">{right ?? `${value} / ${max}`}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

/** 15초마다 바뀌는 지금 시각(화면이 뜬 뒤에만 · 서버 HTML과 어긋나지 않게) */
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  const refresh = () => setNow(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return [now, refresh] as const;
}

/** 요괴 마을(개발 중 · 마스터만): 첫 요괴 고르기 → 여러 마리 키우기 · 대표 요괴 · 도감 · 등장 연출 */
export function YokaiVillage({ initial }: { initial: YokaiView | null }) {
  const [yokai, setYokai] = useState<YokaiView | null>(initial);
  const [pick, setPick] = useState<YokaiSpecies | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [evolved, setEvolved] = useState<number | null>(null);
  const [bounce, setBounce] = useState(0);
  const [dexPick, setDexPick] = useState<YokaiSpecies | null>(null);
  const [arrivalIndex, setArrivalIndex] = useState(0);
  const [now, refreshNow] = useNow();

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/yokai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json()) as { yokai?: YokaiView | null; evolved?: number | null; error?: string };
      if (json.yokai !== undefined) setYokai(json.yokai ?? null);
      if (!res.ok) throw new Error(json.error ?? "잠시 뒤에 다시 해 주세요.");
      if (json.evolved) setEvolved(json.evolved);
      if (body.action === "feed" || body.action === "pet") setBounce((n) => n + 1);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "잠시 뒤에 다시 해 주세요.");
    } finally {
      setBusy(false);
      // 남은 시간을 방금 받은 기록 기준으로 바로 다시 계산
      refreshNow();
    }
  }

  const a = yokai?.active;
  const feedWait = a?.nextFeedAt && now != null && Date.parse(a.nextFeedAt) > now ? new Date(a.nextFeedAt) : null;
  const petWait = a?.nextPetAt && now != null && Date.parse(a.nextPetAt) > now ? new Date(a.nextPetAt) : null;
  const feedsLeft = yokai ? yokai.feeds.allowed - yokai.feeds.used : 0;
  const petsLeft = a ? a.pets.max - a.pets.used : 0;
  const arriving = yokai?.newcomers[arrivalIndex] ?? null;

  return (
    <div className="flex flex-col gap-4" data-yokai-village>
      <style>{`@keyframes yk-bob{50%{transform:translateY(-8px)}}@keyframes yk-hop{30%{transform:translateY(-22px) scale(1.04)}60%{transform:translateY(0) scale(.98)}}@keyframes yk-glow{0%{opacity:0;transform:scale(.6)}40%{opacity:1}100%{opacity:1;transform:scale(1)}}@keyframes yk-rise{0%{opacity:0;transform:translateY(40px) scale(.85);filter:brightness(3)}60%{opacity:1;filter:brightness(1.6)}100%{opacity:1;transform:none;filter:none}}@keyframes yk-shine{0%{transform:translateX(-120%) rotate(20deg)}60%,100%{transform:translateX(220%) rotate(20deg)}}.yk-legend::after{content:"";position:absolute;inset:-20% auto -20% 0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,236,170,.45),transparent);animation:yk-shine 3.2s ease-in-out infinite;pointer-events:none}@media (prefers-reduced-motion:reduce){.yk-legend::after{animation:none}}`}</style>
      <header className="board-intro">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black text-[#f3d9a4]">🏮 요괴 마을</h1>
          <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-white">개발 중 · 마스터만 보여요</span>
        </div>
        <p className="mt-2">요괴를 키우고, 사이트 활동으로 새 요괴를 만나 보세요. 출석 · 퀴즈 · 글쓰기를 하면 밥이 늘어나요.</p>
      </header>

      {!yokai || !a ? (
        <section aria-label="첫 요괴 고르기" data-yokai-pick className="lounge-card grid gap-3 rounded-[1.35rem] p-4">
          <h2 className="text-lg font-black text-white">함께할 첫 요괴를 골라 주세요</h2>
          <p className="text-xs text-zinc-400">셋 다 자라는 속도는 같아요. 고르지 않은 요괴도 나중에 만날 수 있어요.</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                data-yokai-starter={s}
                onClick={() => setPick(s)}
                className={cn(
                  "grid justify-items-center gap-1 rounded-2xl border bg-black/30 p-2 text-center transition sm:p-3",
                  pick === s ? "border-[#e7c98a] shadow-[0_0_0_2px_rgba(231,201,138,.35)]" : "border-[#c9a25c]/30 hover:border-[#c9a25c]",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림(이미 작게 줄인 webp) */}
                <img src={yokaiImage(s, 1)} alt="" className="aspect-square w-full max-w-36 object-contain" />
                <b className="text-base text-white">{YOKAI[s].name}</b>
                <ElementTag species={s} />
              </button>
            ))}
          </div>
          {pick ? (
            <div className="grid gap-3 rounded-2xl border border-[#c9a25c]/30 bg-black/30 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-bold text-white">{YOKAI[pick].intro}</p>
                <div className="mt-2 flex items-end gap-1">
                  {[1, 2, 3, 4, 5].map((k) => (
                    // eslint-disable-next-line @next/next/no-img-element -- 진화 미리보기
                    <img key={k} src={yokaiImage(pick, k)} alt="" className="object-contain" style={{ width: 28 + k * 8, height: 28 + k * 8 }} />
                  ))}
                  <span className="ml-1 text-xs text-zinc-400">→ {YOKAI[pick].stages[4]}</span>
                </div>
              </div>
              <button
                type="button"
                data-yokai-choose
                disabled={busy}
                onClick={() => void act({ action: "choose", species: pick })}
                className="min-h-12 rounded-xl bg-[#7a1c22] px-5 text-sm font-black text-white hover:bg-[#93242c] disabled:opacity-60"
              >
                {YOKAI[pick].name}와 시작하기
              </button>
            </div>
          ) : null}
          {note ? <p className="text-sm font-bold text-rose-300">{note}</p> : null}
        </section>
      ) : (
        <>
          <section aria-label="내 요괴" data-yokai-home className="lounge-card grid gap-4 rounded-[1.35rem] p-4 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl border border-[#c9a25c]/30" style={{ background: stageBackground(a.species, yokai.bg.active) }}>
              <p data-yokai-mood className="absolute inset-x-3 top-3 z-10 rounded-xl border border-[#c9a25c]/30 bg-black/60 px-3 py-2 text-sm text-[#ece4d6]">
                {yokai.mood}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
              <img
                key={`${a.species}-${bounce}`}
                src={yokaiImage(a.species, a.stage)}
                alt={`${a.name} ${a.stage}단계`}
                className="mt-12 w-[70%] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,.6)]"
                style={{ animation: bounce ? "yk-hop .6s ease-out, yk-bob 2.4s ease-in-out .6s infinite" : "yk-bob 2.4s ease-in-out infinite" }}
              />
            </div>
            <div className="grid gap-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <b data-yokai-stage-name className="text-2xl text-white">
                  {a.stageName}
                </b>
                <span className="text-xs text-zinc-400">
                  {a.name} · {a.stage}단계
                </span>
                <ElementTag species={a.species} />
                <span className={cn("text-[11px] font-black", RARITY_TEXT[YOKAI[a.species].rarity])}>{RARITY_LABEL[YOKAI[a.species].rarity]}</span>
              </div>
              {yokai.main === a.species ? (
                <p data-yokai-is-main className="text-xs font-bold text-[#f5d76e]">
                  ⭐ 대표 요괴(프로필 · 닉네임 옆에 보여요)
                </p>
              ) : (
                <button
                  type="button"
                  data-yokai-set-main
                  disabled={busy}
                  onClick={() => void act({ action: "main", species: a.species })}
                  className="min-h-9 w-fit rounded-lg border border-[#f5d76e]/50 px-3 text-xs font-bold text-[#f5d76e] hover:bg-[#f5d76e]/10"
                >
                  ⭐ 대표 요괴로 정하기
                </button>
              )}
              <Bar label="포만감" value={a.fullness} max={100} color="#e7a24a" right={`${a.fullness} / 100${a.fullness >= 80 ? " · 배불러요" : ""}`} />
              <Bar label="친밀도" value={a.affection} max={100} color="#e86a8a" />
              {a.next ? (
                <Bar label={`다음 진화(${YOKAI[a.species].stages[a.next.stage]})까지`} value={a.next.have} max={a.next.need} color="#c9a25c" right={`경험치 ${a.next.have} / ${a.next.need}`} />
              ) : (
                <p className="text-sm font-black text-[#f5d76e]">✨ 최종 진화 완료!</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-yokai-feed
                  disabled={busy || feedsLeft <= 0 || Boolean(feedWait)}
                  onClick={() => void act({ action: "feed" })}
                  className="grid min-h-12 place-items-center rounded-xl bg-[#7a1c22] px-2 text-sm font-black text-white hover:bg-[#93242c] disabled:opacity-50"
                >
                  <span>
                    🍙 밥 주기 {feedsLeft}/{yokai.feeds.allowed}
                  </span>
                  {feedWait && now != null && feedsLeft > 0 ? (
                    <span data-yokai-feed-wait className="text-[11px] font-bold text-[#ffd9a0]">
                      배불러요 · {waitText(feedWait, new Date(now))} 뒤
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  data-yokai-pet
                  disabled={busy || petsLeft <= 0 || Boolean(petWait)}
                  onClick={() => void act({ action: "pet" })}
                  className="grid min-h-12 place-items-center rounded-xl border border-[#c9a25c]/40 bg-black/40 px-2 text-sm font-black text-white hover:border-[#c9a25c] disabled:opacity-50"
                >
                  <span>
                    🤚 쓰다듬기 {petsLeft}/{a.pets.max}
                  </span>
                  {petWait && now != null && petsLeft > 0 ? (
                    <span data-yokai-pet-wait className="text-[11px] font-bold text-[#ffd9a0]">
                      쉬는 중 · {waitText(petWait, new Date(now))} 뒤
                    </span>
                  ) : null}
                </button>
              </div>
              {note ? <p className="text-sm font-bold text-rose-300">{note}</p> : null}
              <ul data-yokai-sources className="grid gap-1 rounded-xl bg-black/30 p-3 text-xs">
                <li className="font-bold text-[#e7c98a]">오늘 밥 받는 법(밥 1번 = 경험치 +20 · 배부르면 쉬었다가)</li>
                <li>✅ 기본 1번</li>
                <li>
                  {yokai.feeds.sources.attended ? "✅" : "⬜"} 출석체크{" "}
                  {!yokai.feeds.sources.attended ? (
                    <Link href="/attendance" className="font-bold text-[#c9a25c] underline">
                      하러 가기
                    </Link>
                  ) : null}
                </li>
                <li>
                  {yokai.feeds.sources.quiz ? "✅" : "⬜"} 오늘의 퀴즈 정답{" "}
                  {!yokai.feeds.sources.quiz ? (
                    <Link href="/quiz" className="font-bold text-[#c9a25c] underline">
                      풀러 가기
                    </Link>
                  ) : null}
                </li>
                <li>
                  {yokai.feeds.sources.wrote ? "✅" : "⬜"} 글이나 댓글 쓰기{" "}
                  {!yokai.feeds.sources.wrote ? (
                    <Link href="/boards/free" className="font-bold text-[#c9a25c] underline">
                      자유게시판
                    </Link>
                  ) : null}
                </li>
              </ul>
            </div>
          </section>

          <PushAlertToggle api="/api/yokai/alert" label="요괴가 배고프면 알림(저녁 7시)" onMessage="요괴가 배고플 때 저녁 7시에 알려 드릴게요." data="yokai" />

          <section aria-label="내 요괴들" data-yokai-owned className="ink-panel grid gap-2 rounded-2xl p-4">
            <h2 className="text-base font-black text-[#f3d9a4]">
              내 요괴들 <span className="text-sm text-zinc-400">{yokai.owned.length}마리 · 눌러서 키울 요괴 바꾸기</span>
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {yokai.owned.map((o) => (
                <button
                  key={o.species}
                  type="button"
                  data-yokai-owned-item={o.species}
                  disabled={busy || o.species === a.species}
                  onClick={() => void act({ action: "active", species: o.species })}
                  className={cn(
                    "relative grid w-20 shrink-0 justify-items-center gap-0.5 overflow-hidden rounded-xl border bg-black/30 p-1.5 text-center text-[11px]",
                    FRAME[YOKAI[o.species].rarity],
                    o.species === a.species && "ring-2 ring-[#e7c98a]",
                  )}
                >
                  {yokai.main === o.species ? <span className="absolute left-1 top-0.5 z-10 text-xs">⭐</span> : null}
                  {/* eslint-disable-next-line @next/next/no-img-element -- 가진 요괴 */}
                  <img src={yokaiImage(o.species, o.stage)} alt="" className="aspect-square w-full object-contain" />
                  <span className="font-bold text-white">{YOKAI[o.species].name}</span>
                  <span className="text-[10px] text-zinc-400">{o.stage}단계</span>
                </button>
              ))}
            </div>
          </section>

          <section aria-label="마을 배경" data-yokai-bg-shop className="ink-panel grid gap-2 rounded-2xl p-4">
            <h2 className="flex flex-wrap items-baseline gap-2 text-base font-black text-[#f3d9a4]">
              마을 배경 <span className="text-sm text-zinc-400">포인트로 바로 사요 · 내 포인트 {yokai.points.toLocaleString()}P</span>
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(YOKAI_BACKGROUNDS) as YokaiBackground[]).map((id) => {
                const bg = YOKAI_BACKGROUNDS[id];
                const owned = yokai.bg.owned.includes(id);
                const using = yokai.bg.active === id;
                return (
                  <div key={id} data-yokai-bg={id} className={cn("grid gap-1.5 rounded-xl border p-1.5", using ? "border-[#e7c98a]" : "border-[#c9a25c]/25")}>
                    <div className="aspect-[4/3] rounded-lg" style={{ background: bg.css }} />
                    <div className="flex items-center gap-1 text-xs">
                      <b className="text-white">{bg.name}</b>
                      <span className="ml-auto text-zinc-400">{owned ? "가짐" : `${bg.price.toLocaleString()}P`}</span>
                    </div>
                    <button
                      type="button"
                      data-yokai-bg-action={owned ? "use" : "buy"}
                      disabled={busy || using || (!owned && yokai.points < bg.price)}
                      onClick={() => void act({ action: owned ? "useBg" : "buyBg", bg: id })}
                      className={cn("min-h-9 rounded-lg text-xs font-black disabled:opacity-50", owned ? "border border-[#c9a25c]/50 text-[#e7c98a]" : "bg-[#7a1c22] text-white")}
                    >
                      {using ? "쓰는 중" : owned ? "쓰기" : yokai.points < bg.price ? "포인트 부족" : "사기"}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-500">전설 요괴(구미호 · 염라대왕)를 키울 때는 전용 배경이 먼저 보여요.</p>
          </section>

          <section aria-label="진화 단계" data-yokai-evo className="ink-panel grid gap-2 rounded-2xl p-4">
            <h2 className="text-base font-black text-[#f3d9a4]">진화 단계</h2>
            <div className="grid grid-cols-5 gap-1.5">
              {YOKAI[a.species].stages.map((label, i) => {
                const open = i + 1 <= a.stage;
                return (
                  <div key={label} className="grid justify-items-center gap-1 text-center text-[11px] text-zinc-400">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 아직이면 실루엣 */}
                    <img src={yokaiImage(a.species, i + 1)} alt="" className={cn("aspect-square w-full object-contain", !open && "opacity-30 brightness-0")} />
                    <span className={cn(open && "font-bold text-white")}>{open ? label : "???"}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-label="요괴 도감" data-yokai-dex className="ink-panel grid gap-2 rounded-2xl p-4">
            <h2 className="text-base font-black text-[#f3d9a4]">
              요괴 도감 <span className="text-sm text-zinc-400">{yokai.dex.length} / 108</span>
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-9">
              {YOKAI_ORDER.map((s) => {
                const have = yokai.dex.includes(s);
                const def = YOKAI[s];
                return (
                  <button
                    key={s}
                    type="button"
                    data-yokai-dex-item={s}
                    data-rarity={def.rarity}
                    onClick={() => setDexPick(dexPick === s ? null : s)}
                    className={cn("relative grid justify-items-center gap-0.5 overflow-hidden rounded-xl border bg-black/30 p-1.5 text-center text-[11px]", FRAME[def.rarity], dexPick === s && "ring-2 ring-[#e7c98a]")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- 못 만난 요괴는 실루엣 */}
                    <img src={yokaiImage(s, 1)} alt="" className={cn("aspect-square w-full object-contain", !have && "opacity-30 brightness-0")} />
                    <span className={have ? "font-bold text-white" : "text-zinc-500"}>{have ? def.name : "???"}</span>
                    <span className={cn("text-[10px] font-bold", RARITY_TEXT[def.rarity])}>{RARITY_LABEL[def.rarity]}</span>
                  </button>
                );
              })}
            </div>
            {dexPick ? <DexDetail species={dexPick} yokai={yokai} /> : null}
            <p className="text-[11px] text-zinc-500">칸을 누르면 얻는 방법과 지금 진행도가 보여요.</p>
          </section>
        </>
      )}

      {arriving ? (
        <div role="dialog" aria-label="새 요괴 등장" data-yokai-arrival={arriving} className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4">
          <div className="grid w-full max-w-sm justify-items-center gap-3 overflow-hidden rounded-3xl border p-5 text-center" style={{ background: stageBackground(arriving), borderColor: YOKAI[arriving].rarity === "legend" ? "#f5d76e" : YOKAI[arriving].rarity === "hero" ? "#d9dde6" : "rgba(201,162,92,.4)" }}>
            <p className={cn("text-sm font-black", RARITY_TEXT[YOKAI[arriving].rarity])}>
              {YOKAI[arriving].rarity === "legend" ? "✨ 전설의 요괴가 나타났어요! ✨" : YOKAI[arriving].rarity === "hero" ? "영웅 요괴가 찾아왔어요!" : "새 요괴가 찾아왔어요!"}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- 등장 */}
            <img
              src={yokaiImage(arriving, YOKAI[arriving].rarity === "legend" ? 5 : 1)}
              alt=""
              className="w-60 max-w-[65vw] object-contain drop-shadow-[0_0_30px_rgba(245,215,110,.45)]"
              style={{ animation: `yk-rise ${YOKAI[arriving].rarity === "legend" ? 1.6 : 0.9}s ease-out both` }}
            />
            <p className="text-2xl font-black text-white">{YOKAI[arriving].name}</p>
            <p className="text-sm text-[#ece4d6]">{YOKAI[arriving].intro}</p>
            {YOKAI[arriving].rarity === "legend" ? <p className="text-xs text-[#f5d76e]">처음 만난 모습은 1단계예요. 키우면 이 모습이 돼요.</p> : null}
            <button
              type="button"
              data-yokai-arrival-ok
              onClick={() => {
                if (arrivalIndex + 1 >= (yokai?.newcomers.length ?? 0)) {
                  setArrivalIndex(0);
                  void act({ action: "seen" });
                } else setArrivalIndex((i) => i + 1);
              }}
              className="min-h-11 rounded-xl bg-[#c9a25c] px-6 text-sm font-black text-black"
            >
              반가워요!
            </button>
          </div>
        </div>
      ) : null}

      {evolved && a && !arriving ? (
        <div role="dialog" aria-label="진화" data-yokai-evolved className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setEvolved(null)}>
          <div className="grid justify-items-center gap-3 text-center" style={{ animation: "yk-glow .9s ease-out both" }}>
            <p className="text-lg font-black text-[#f5d76e]">✨ 진화했어요! ✨</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- 새 모습 */}
            <img src={yokaiImage(a.species, evolved)} alt="" className="w-64 max-w-[70vw] object-contain drop-shadow-[0_0_30px_rgba(245,215,110,.45)]" />
            <p className="text-2xl font-black text-white">{YOKAI[a.species].stages[evolved - 1]}</p>
            <button type="button" className="min-h-11 rounded-xl bg-[#c9a25c] px-6 text-sm font-black text-black">
              좋아요!
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 도감 칸을 눌렀을 때: 만난 요괴는 지금 모습 · 소개, 못 만난 요괴는 얻는 방법 · 진행도(구미호는 아홉 꼬리) */
function DexDetail({ species, yokai }: { species: YokaiSpecies; yokai: YokaiView }) {
  const def = YOKAI[species];
  const owned = yokai.owned.find((o) => o.species === species);
  return (
    <div data-yokai-dex-detail className="grid gap-2 rounded-xl border border-[#c9a25c]/30 bg-black/40 p-3">
      <div className="grid grid-cols-[72px_1fr] items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- 고른 요괴 */}
        <img src={yokaiImage(species, owned ? owned.stage : 1)} alt="" className={cn("aspect-square w-full object-contain", !owned && "opacity-40 brightness-0")} />
        <div className="grid gap-1 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <b className="text-white">{owned ? def.name : "???"}</b>
            <span className={cn("text-xs font-black", RARITY_TEXT[def.rarity])}>{RARITY_LABEL[def.rarity]}</span>
            {owned ? <ElementTag species={species} /> : null}
            {owned ? <span className="text-xs text-zinc-400">{owned.stage}단계 · {def.stages[owned.stage - 1]}</span> : null}
          </div>
          <p className="text-xs text-[#d1c7b5]">{owned ? def.intro : def.how}</p>
          {!owned && yokai.progress[species] ? (
            <p data-yokai-progress className="text-xs font-bold text-[#e7c98a]">
              지금: {yokai.progress[species]}
            </p>
          ) : null}
        </div>
      </div>
      {species === "gumiho" && !owned ? (
        <ul data-yokai-tails className="grid gap-1 rounded-lg bg-black/30 p-2 text-xs sm:grid-cols-3">
          {yokai.tails.map((t, i) => (
            <li key={t.label} className={cn("flex items-center gap-1", t.done ? "text-[#f5d76e]" : "text-zinc-400")}>
              <span>{t.done ? "🦊" : "◌"}</span>
              <span>
                꼬리 {i + 1} · {t.label}
              </span>
              <span className="ml-auto tabular-nums">{t.progress}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
