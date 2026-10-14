"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { STARTERS, YOKAI, YOKAI_ORDER, yokaiImage, type YokaiSpecies } from "@/lib/yokai";
import type { YokaiView } from "@/lib/yokai-server";

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
};

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

/** 요괴 마을(개발 중 · 마스터만): 첫 요괴 고르기 → 밥 주기 · 쓰다듬기 · 진화 · 도감 */
export function YokaiVillage({ initial }: { initial: YokaiView | null }) {
  const [yokai, setYokai] = useState<YokaiView | null>(initial);
  const [pick, setPick] = useState<YokaiSpecies | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [evolved, setEvolved] = useState<number | null>(null);
  const [bounce, setBounce] = useState(0);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/yokai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json()) as { yokai?: YokaiView | null; evolved?: number | null; error?: string };
      if (!res.ok) throw new Error(json.error ?? "잠시 뒤에 다시 해 주세요.");
      setYokai(json.yokai ?? null);
      if (json.evolved) setEvolved(json.evolved);
      if (body.action !== "choose") setBounce((n) => n + 1);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "잠시 뒤에 다시 해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-yokai-village>
      <style>{`@keyframes yk-bob{50%{transform:translateY(-8px)}}@keyframes yk-hop{30%{transform:translateY(-22px) scale(1.04)}60%{transform:translateY(0) scale(.98)}}@keyframes yk-glow{0%{opacity:0;transform:scale(.6)}40%{opacity:1}100%{opacity:1;transform:scale(1)}}`}</style>
      <header className="board-intro">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black text-[#f3d9a4]">🏮 요괴 마을</h1>
          <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-white">개발 중 · 마스터만 보여요</span>
        </div>
        <p className="mt-2">요괴를 골라 밥을 주고 키워 보세요. 출석 · 퀴즈 · 글쓰기를 하면 밥이 늘어나요.</p>
      </header>

      {!yokai ? (
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
            <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl border border-[#c9a25c]/30 bg-[radial-gradient(circle_at_50%_70%,rgba(201,162,92,.18),transparent_60%),linear-gradient(#22150f,#0d0907)]">
              <p data-yokai-mood className="absolute inset-x-3 top-3 rounded-xl border border-[#c9a25c]/30 bg-black/60 px-3 py-2 text-sm text-[#ece4d6]">
                {yokai.mood}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
              <img
                key={bounce}
                src={yokaiImage(yokai.species, yokai.stage)}
                alt={`${yokai.name} ${yokai.stage}단계`}
                className="mt-12 w-[70%] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,.6)]"
                style={{ animation: bounce ? "yk-hop .6s ease-out, yk-bob 2.4s ease-in-out .6s infinite" : "yk-bob 2.4s ease-in-out infinite" }}
              />
            </div>
            <div className="grid gap-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <b data-yokai-stage-name className="text-2xl text-white">
                  {yokai.stageName}
                </b>
                <span className="text-xs text-zinc-400">
                  {yokai.name} · {yokai.stage}단계
                </span>
                <ElementTag species={yokai.species} />
              </div>
              <Bar label="포만감" value={yokai.fullness} max={100} color="#e7a24a" />
              <Bar label="친밀도" value={yokai.affection} max={100} color="#e86a8a" />
              {yokai.next ? (
                <Bar label={`다음 진화(${YOKAI[yokai.species].stages[yokai.next.stage]})까지`} value={yokai.next.have} max={yokai.next.need} color="#c9a25c" right={`경험치 ${yokai.next.have} / ${yokai.next.need}`} />
              ) : (
                <p className="text-sm font-black text-[#f5d76e]">✨ 최종 진화 완료!</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-yokai-feed
                  disabled={busy || yokai.feeds.used >= yokai.feeds.allowed}
                  onClick={() => void act({ action: "feed" })}
                  className="min-h-12 rounded-xl bg-[#7a1c22] text-sm font-black text-white hover:bg-[#93242c] disabled:opacity-50"
                >
                  🍙 밥 주기 {yokai.feeds.allowed - yokai.feeds.used}/{yokai.feeds.allowed}
                </button>
                <button
                  type="button"
                  data-yokai-pet
                  disabled={busy || yokai.pets.used >= yokai.pets.max}
                  onClick={() => void act({ action: "pet" })}
                  className="min-h-12 rounded-xl border border-[#c9a25c]/40 bg-black/40 text-sm font-black text-white hover:border-[#c9a25c] disabled:opacity-50"
                >
                  🤚 쓰다듬기 {yokai.pets.max - yokai.pets.used}/{yokai.pets.max}
                </button>
              </div>
              {note ? <p className="text-sm font-bold text-rose-300">{note}</p> : null}
              <ul data-yokai-sources className="grid gap-1 rounded-xl bg-black/30 p-3 text-xs">
                <li className="font-bold text-[#e7c98a]">오늘 밥 받는 법(밥 1번 = 경험치 +20)</li>
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

          <section aria-label="진화 단계" data-yokai-evo className="ink-panel grid gap-2 rounded-2xl p-4">
            <h2 className="text-base font-black text-[#f3d9a4]">진화 단계</h2>
            <div className="grid grid-cols-5 gap-1.5">
              {YOKAI[yokai.species].stages.map((label, i) => {
                const open = i + 1 <= yokai.stage;
                return (
                  <div key={label} className="grid justify-items-center gap-1 text-center text-[11px] text-zinc-400">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 아직이면 실루엣 */}
                    <img src={yokaiImage(yokai.species, i + 1)} alt="" className={cn("aspect-square w-full object-contain", !open && "opacity-30 brightness-0")} />
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
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {YOKAI_ORDER.map((s) => {
                const have = yokai.dex.includes(s);
                return (
                  <div key={s} title={have ? YOKAI[s].intro : YOKAI[s].how} className="grid justify-items-center gap-1 rounded-xl border border-[#c9a25c]/20 bg-black/30 p-1.5 text-center text-[11px]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 못 만난 요괴는 실루엣 */}
                    <img src={yokaiImage(s, 1)} alt="" className={cn("aspect-square w-full object-contain", !have && "opacity-30 brightness-0")} />
                    <span className={have ? "font-bold text-white" : "text-zinc-500"}>{have ? YOKAI[s].name : "???"}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-500">다른 요괴는 사이트 활동에 따라 찾아오게 만들 예정이에요(다음 단계).</p>
          </section>
        </>
      )}

      {evolved && yokai ? (
        <div role="dialog" aria-label="진화" data-yokai-evolved className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setEvolved(null)}>
          <div className="grid justify-items-center gap-3 text-center" style={{ animation: "yk-glow .9s ease-out both" }}>
            <p className="text-lg font-black text-[#f5d76e]">✨ 진화했어요! ✨</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- 새 모습 */}
            <img src={yokaiImage(yokai.species, evolved)} alt="" className="w-64 max-w-[70vw] object-contain drop-shadow-[0_0_30px_rgba(245,215,110,.45)]" />
            <p className="text-2xl font-black text-white">{YOKAI[yokai.species].stages[evolved - 1]}</p>
            <button type="button" className="min-h-11 rounded-xl bg-[#c9a25c] px-6 text-sm font-black text-black">
              좋아요!
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
