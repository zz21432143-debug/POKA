"use client";

import { VILLAGE_ALL_MARKS } from "@/lib/yokai-marks";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/ui/link";
import { createPortal } from "react-dom";
import { cn } from "cn";
import {
  bgCss,
  stageBg,
  bgReady,
  CLEAN_BONUS_AT,
  CLEAN_BONUS_EXP,
  BOND_BONUS_AT,
  BOND_BONUS_EXP,
  FEED,
  RARITY_LABEL,
  SHOWER_BELOW,
  STARTERS,
  YOKAI,
  YOKAI_BACKGROUNDS,
  YOKAI_ORDER,
  waitText,
  yokaiImage,
  type YokaiBackground,
  type YokaiRarity,
  type YokaiSpecies,
} from "@/lib/yokai";
import { pickLine } from "@/lib/yokai-lines";
import { josa } from "@/lib/quiz";
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
  legend:
    "yk-legend border-2 border-[#f5d76e] shadow-[0_0_14px_rgba(245,215,110,.45)]",
};
const RARITY_TEXT: Record<YokaiRarity, string> = {
  starter: "text-zinc-400",
  common: "text-zinc-400",
  rare: "text-sky-300",
  hero: "text-[#e6e9f2]",
  legend: "text-[#f5d76e]",
};

const stageBackground = stageBg;

function ElementTag({ species }: { species: YokaiSpecies }) {
  const el = YOKAI[species].element;
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[11px] font-black",
        TONE[el.tone],
      )}
    >
      {el.label}
    </span>
  );
}

function Bar({
  label,
  value,
  max,
  color,
  right,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  right?: string;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="tabular-nums">{right ?? `${value} / ${max}`}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-white/15 bg-[#0b0712]">
        <div
          data-yokai-gauge
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.min(100, (value / max) * 100)}%`,
            background: color,
            // 고대비 네온: 바 색으로 빛나게
            boxShadow: "0 0 10px var(--glow, #fff6), inset 0 1px 0 rgba(255,255,255,.45)",
          }}
        />
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
export function YokaiVillage({
  initial,
  returnTo,
  markCollection = 0,
}: {
  initial: YokaiView | null;
  /** 첫 요괴를 고르면 돌아갈 곳(오락실 등) */ returnTo?: string | null;
  /** 요괴 마을 마크 도감 모은 수 */
  markCollection?: number;
}) {
  const [yokai, setYokai] = useState<YokaiView | null>(initial);
  const [pick, setPick] = useState<YokaiSpecies | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [evolved, setEvolved] = useState<number | null>(null);
  const [bounce, setBounce] = useState(0);
  const [dexPick, setDexPick] = useState<YokaiSpecies | null>(null);
  const [arrivalIndex, setArrivalIndex] = useState(0);
  /** 보고 있는 요괴(내 요괴들에서 고름 · 돌보기는 대표 요괴만) · 대표 바꾸기 확인 창 */
  const [viewing, setViewing] = useState<YokaiSpecies | null>(null);
  /** 반응 대사 번호(누를 때마다 다른 대사) */
  const reactionSeq = useRef(0);
  const [confirmMain, setConfirmMain] = useState<YokaiSpecies | null>(null);
  /** 사기 전에 마을에 깔아 보는 배경 */
  const [previewBg, setPreviewBg] = useState<YokaiBackground | null>(null);
  /** 방금 한 행동의 반응(말풍선 대사 · 효과) · 몇 초 뒤 사라짐 */
  const [reaction, setReaction] = useState<{
    kind: "fed" | "pet" | "shower" | "bond";
    text: string;
    key: number;
    exp?: number;
  } | null>(() => {
    // 오늘 처음 들어왔으면 인사 보너스 말풍선
    const g = initial?.greeting;
    if (!g || !initial) return null;
    const base = `👋 오늘 첫 방문! 친밀도 +${g.amount}`;
    return g.bond
      ? {
          kind: "bond",
          text: `${base} · 💕 ${josa(g.bond.name, "이가")} 됐어요! +${g.bond.points}P`,
          key: -1,
        }
      : {
          kind: "pet",
          text: `${base} · ${pickLine(initial.active.species, "greet", 1)}`,
          key: -1,
        };
  });
  useEffect(() => {
    const id = window.setTimeout(
      () => setReaction((r) => (r?.key === -1 ? null : r)),
      6000,
    );
    return () => window.clearTimeout(id);
  }, []);
  const [now, refreshNow] = useNow();

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/yokai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        yokai?: YokaiView | null;
        evolved?: number | null;
        bond?: { at: number; points: number; name: string } | null;
        error?: string;
      };
      if (json.yokai !== undefined) setYokai(json.yokai ?? null);
      if (!res.ok) throw new Error(json.error ?? "잠시 뒤에 다시 해 주세요.");
      if (json.evolved) setEvolved(json.evolved);
      // 오락실에서 요괴를 고르러 왔으면 고른 뒤 바로 돌아감
      if (body.action === "choose" && returnTo) {
        window.location.href = returnTo;
        return;
      }
      if (
        body.action === "feed" ||
        body.action === "pet" ||
        body.action === "shower"
      ) {
        setBounce((n) => n + 1);
        const kind =
          body.action === "feed"
            ? "fed"
            : body.action === "pet"
              ? "pet"
              : "shower";
        const next = json.yokai?.active;
        if (next) {
          reactionSeq.current += 1;
          const key = reactionSeq.current;
          const exp =
            kind === "fed" && yokai ? next.exp - yokai.active.exp : undefined;
          if (json.bond)
            setReaction({
              kind: "bond",
              text: `💕 ${josa(json.bond.name, "이가")} 됐어요! +${json.bond.points}P · ${pickLine(next.species, "bond", key)}`,
              key,
            });
          else
            setReaction({
              kind,
              text: pickLine(next.species, kind, key),
              key,
              exp: exp && exp > 0 ? exp : undefined,
            });
          window.setTimeout(
            () => setReaction((r) => (r?.key === key ? null : r)),
            json.bond ? 6000 : 3800,
          );
        }
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : "잠시 뒤에 다시 해 주세요.");
    } finally {
      setBusy(false);
      // 남은 시간을 방금 받은 기록 기준으로 바로 다시 계산
      refreshNow();
    }
  }

  const a = yokai?.active;
  const v = (viewing && yokai?.owned.find((o) => o.species === viewing)) || a;
  /** 대표가 아닌 요괴를 보는 중 */
  const viewingOther = Boolean(a && v && v.species !== a.species);
  /** 대표 바꾸기 확인 창: 그 요괴로 바꾸는 값(처음이면 0) */
  const confirmCost =
    confirmMain && yokai
      ? (yokai.owned.find((o) => o.species === confirmMain)?.mainCost ??
        yokai.mainChangeCost)
      : 0;
  const feedWait =
    a?.nextFeedAt && now != null && Date.parse(a.nextFeedAt) > now
      ? new Date(a.nextFeedAt)
      : null;
  const petWait =
    a?.nextPetAt && now != null && Date.parse(a.nextPetAt) > now
      ? new Date(a.nextPetAt)
      : null;
  const showerWait =
    a?.nextShowerAt && now != null && Date.parse(a.nextShowerAt) > now
      ? new Date(a.nextShowerAt)
      : null;
  const feedsLeft = yokai ? yokai.feeds.allowed - yokai.feeds.used : 0;
  const petsLeft = a ? a.pets.max - a.pets.used : 0;
  const arriving = yokai?.newcomers[arrivalIndex] ?? null;

  return (
    <div className="flex flex-col gap-4" data-yokai-village>
      <style>{`@keyframes yk-bob{50%{transform:translateY(-8px)}}@keyframes yk-hop{30%{transform:translateY(-22px) scale(1.04)}60%{transform:translateY(0) scale(.98)}}@keyframes yk-glow{0%{opacity:0;transform:scale(.6)}40%{opacity:1}100%{opacity:1;transform:scale(1)}}@keyframes yk-rise{0%{opacity:0;transform:translateY(40px) scale(.85);filter:brightness(3)}60%{opacity:1;filter:brightness(1.6)}100%{opacity:1;transform:none;filter:none}}@keyframes yk-pop{0%{opacity:0;transform:translateY(6px) scale(.96)}100%{opacity:1;transform:none}}@keyframes yk-rise-fx{0%{opacity:0;transform:translateY(10px) scale(.6)}20%{opacity:1}100%{opacity:0;transform:translateY(-90px) scale(1.15)}}@keyframes yk-fly{0%,100%{transform:translate(0,0)}25%{transform:translate(8px,-6px)}50%{transform:translate(-4px,-12px)}75%{transform:translate(-9px,-4px)}}@keyframes yk-shine{0%{transform:translateX(-120%) rotate(20deg)}60%,100%{transform:translateX(220%) rotate(20deg)}}.yk-legend::after{content:"";position:absolute;inset:-20% auto -20% 0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,236,170,.45),transparent);animation:yk-shine 3.2s ease-in-out infinite;pointer-events:none}@media (prefers-reduced-motion:reduce){.yk-legend::after{animation:none}}`}</style>
      <header className="board-intro">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black text-[#f3d9a4]">🏮 요괴 마을</h1>
        </div>
        <p className="mt-2">
          요괴를 키우고, 사이트 활동으로 새 요괴를 만나 보세요. 출석 · 퀴즈 ·
          글쓰기를 하면 밥이 늘어나요.
        </p>
      </header>

      {!yokai || !a || !v ? (
        <section
          aria-label="첫 요괴 고르기"
          data-yokai-pick
          className="lounge-card grid gap-3 rounded-[1.35rem] p-4"
        >
          {returnTo ? (
            <p
              data-yokai-need
              className="rounded-xl border-2 border-[#ffd54a] bg-[#ffd54a]/15 px-3 py-2 text-sm font-black text-[#ffe9a3]"
            >
              🎮 요괴 오락실은 함께할 요괴가 있어야 들어갈 수 있어요! 요괴를
              고르면 바로 돌아가요.
            </p>
          ) : null}
          <h2 className="text-lg font-black text-white">
            함께할 첫 요괴를 골라 주세요
          </h2>
          <p className="text-xs text-zinc-400">
            셋 다 자라는 속도는 같아요. 고르지 않은 요괴도 나중에 만날 수
            있어요.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                data-yokai-starter={s}
                onClick={() => setPick(s)}
                className={cn(
                  "grid justify-items-center gap-1 rounded-2xl border bg-black/30 p-2 text-center transition sm:p-3",
                  pick === s
                    ? "border-[#e7c98a] shadow-[0_0_0_2px_rgba(231,201,138,.35)]"
                    : "border-[#c9a25c]/30 hover:border-[#c9a25c]",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림(이미 작게 줄인 webp) */}
                <img
                  src={yokaiImage(s, 1)}
                  alt=""
                  className="aspect-square w-full max-w-36 object-contain"
                />
                <b className="text-base text-white">{YOKAI[s].name}</b>
                <ElementTag species={s} />
              </button>
            ))}
          </div>
          {pick ? (
            <div className="grid gap-3 rounded-2xl border border-[#c9a25c]/30 bg-black/30 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-bold text-white">
                  {YOKAI[pick].intro}
                </p>
                <div className="mt-2 flex items-end gap-1">
                  {[1, 2, 3, 4, 5].map((k) => (
                    // eslint-disable-next-line @next/next/no-img-element -- 진화 미리보기
                    <img
                      key={k}
                      src={yokaiImage(pick, k)}
                      alt=""
                      className="object-contain"
                      style={{ width: 28 + k * 8, height: 28 + k * 8 }}
                    />
                  ))}
                  <span className="ml-1 text-xs text-zinc-400">
                    → {YOKAI[pick].stages[4]}
                  </span>
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
          {note ? (
            <p className="text-sm font-bold text-rose-300">{note}</p>
          ) : null}
        </section>
      ) : (
        <>
          <section
            aria-label="내 요괴"
            data-yokai-home
            className="lounge-card overflow-hidden rounded-[1.35rem] md:grid md:grid-cols-[1.05fr_1fr]"
          >
            <div
              className="relative grid aspect-square place-items-center overflow-hidden md:aspect-auto md:min-h-[440px]"
              style={{
                background: stageBackground(
                  v.species,
                  previewBg ?? yokai.bg.active,
                ),
              }}
            >
              {previewBg ? (
                <div
                  data-yokai-bg-preview
                  className="absolute inset-x-3 bottom-[4.4rem] z-30 flex flex-wrap items-center gap-2 rounded-xl border border-[#f5d76e]/50 bg-black/75 px-3 py-2 text-xs font-bold text-[#f6efe2] backdrop-blur-sm"
                >
                  <span>👀 미리보기 · {YOKAI_BACKGROUNDS[previewBg].name}</span>
                  <span className="ml-auto flex gap-1.5">
                    <button
                      type="button"
                      data-yokai-bg-preview-buy
                      disabled={
                        busy ||
                        yokai.points < YOKAI_BACKGROUNDS[previewBg].price
                      }
                      onClick={async () => {
                        const id = previewBg;
                        setPreviewBg(null);
                        await act({ action: "buyBg", bg: id });
                      }}
                      className="min-h-9 rounded-lg bg-[#7a1c22] px-3 font-black text-white disabled:opacity-50"
                    >
                      {yokai.points < YOKAI_BACKGROUNDS[previewBg].price
                        ? "포인트 부족"
                        : `${YOKAI_BACKGROUNDS[previewBg].price.toLocaleString()}P 사기`}
                    </button>
                    <button
                      type="button"
                      data-yokai-bg-preview-close
                      onClick={() => setPreviewBg(null)}
                      className="min-h-9 rounded-lg border border-white/25 px-3"
                    >
                      닫기
                    </button>
                  </span>
                </div>
              ) : null}
              {/* 말풍선: 요괴 대사(방금 한 행동이 있으면 그 반응) */}
              <div className="absolute inset-x-4 top-4 z-20 flex justify-center">
                <p
                  key={reaction?.key ?? "mood"}
                  data-yokai-mood
                  className="relative max-w-[92%] rounded-2xl border border-[#c9a25c]/40 bg-[#120c0a]/85 px-4 py-2.5 text-center text-sm font-bold leading-snug text-[#f6efe2] shadow-[0_6px_18px_rgba(0,0,0,.45)] backdrop-blur-sm"
                  style={{ animation: "yk-pop .35s ease-out both" }}
                >
                  {reaction?.text ??
                    (viewingOther
                      ? pickLine(v.species, "greet", 0)
                      : yokai.mood)}
                  <span
                    aria-hidden
                    className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-[#c9a25c]/40 bg-[#120c0a]/85"
                  />
                </p>
              </div>
              <div className="absolute left-3 top-[4.6rem] z-10 flex flex-col gap-1">
                <span
                  className={cn(
                    "w-fit rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-black",
                    RARITY_TEXT[YOKAI[v.species].rarity],
                  )}
                >
                  {RARITY_LABEL[YOKAI[v.species].rarity]}
                </span>
                <ElementTag species={v.species} />
              </div>
              {/* 요괴 + 꼬질꼬질 효과 */}
              <div className="relative mt-14 w-[68%]">
                {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
                <img
                  key={`${v.species}-${bounce}`}
                  src={yokaiImage(v.species, v.stage)}
                  alt={`${v.name} ${v.stage}단계`}
                  className={cn(
                    "w-full object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,.6)] transition-[filter] duration-700",
                    v.clean < 30 &&
                      "sepia-[.45] saturate-[.7] brightness-[.85]",
                  )}
                  style={{
                    animation: bounce
                      ? "yk-hop .6s ease-out, yk-bob 2.4s ease-in-out .6s infinite"
                      : "yk-bob 2.4s ease-in-out infinite",
                  }}
                />
                {v.clean < 30 ? (
                  <div
                    aria-hidden
                    data-yokai-dirty
                    className="pointer-events-none absolute inset-0"
                  >
                    {[
                      [18, 30, 14],
                      [62, 22, 10],
                      [40, 62, 16],
                      [74, 58, 9],
                      [28, 78, 8],
                    ].map(([x, y, s], i) => (
                      <span
                        key={i}
                        className="absolute rounded-full bg-[#4a3423]/55 blur-[1px]"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: s,
                          height: s * 0.7,
                        }}
                      />
                    ))}
                    {[0, 1, 2].map((i) => (
                      <span
                        key={`f${i}`}
                        className="absolute text-xs opacity-70"
                        style={{
                          left: `${20 + i * 28}%`,
                          top: "-4%",
                          animation: `yk-fly ${2 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
                        }}
                      >
                        ·
                      </span>
                    ))}
                  </div>
                ) : null}
                {/* 반응 효과 */}
                {reaction ? (
                  <div
                    aria-hidden
                    key={reaction.key}
                    className="pointer-events-none absolute inset-0"
                  >
                    {(reaction.kind === "shower"
                      ? ["🫧", "🫧", "✨", "🫧", "🫧", "✨"]
                      : reaction.kind === "bond"
                        ? ["💖", "💕", "✨", "💗", "💖", "💕", "✨"]
                        : reaction.kind === "pet"
                          ? ["💕", "💗", "💕"]
                          : ["🍙", reaction.exp ? `+${reaction.exp}` : "😋"]
                    ).map((e, i) => (
                      <span
                        key={i}
                        className={cn(
                          "absolute font-black",
                          e.startsWith("+")
                            ? "text-sm text-[#f5d76e]"
                            : "text-xl",
                        )}
                        style={{
                          left: `${15 + ((i * 37) % 70)}%`,
                          bottom: `${10 + (i % 3) * 8}%`,
                          animation: `yk-rise-fx 1.4s ease-out ${i * 0.12}s both`,
                        }}
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {/* 이름표 */}
              <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10">
                <div className="min-w-0">
                  <b
                    data-yokai-stage-name
                    className="block truncate text-2xl leading-tight text-white drop-shadow"
                  >
                    {v.stageName}
                  </b>
                  <span className="text-xs text-[#d1c7b5]">
                    {v.name} · {v.stage}단계
                  </span>
                </div>
                {yokai.main === v.species ? (
                  <span
                    data-yokai-is-main
                    className="shrink-0 rounded-full bg-[#f5d76e]/15 px-2 py-1 text-[11px] font-black text-[#f5d76e]"
                  >
                    ⭐ 대표 요괴 · 돌보는 중
                  </span>
                ) : (
                  <button
                    type="button"
                    data-yokai-set-main
                    disabled={busy}
                    onClick={() => setConfirmMain(v.species)}
                    className="min-h-9 shrink-0 rounded-full border border-[#f5d76e]/60 bg-black/40 px-3 text-[11px] font-black text-[#f5d76e] hover:bg-[#f5d76e]/10"
                  >
                    ⭐ 대표로 바꾸기 ·{" "}
                    {v.mainCost ? `${v.mainCost}P` : "처음 무료"}
                  </button>
                )}
              </div>
            </div>

            <div className="grid content-start gap-3 p-4">
              <div className="grid gap-2.5" data-yokai-stats>
                <Bar
                  label="🍙 포만감"
                  value={v.fullness}
                  max={100}
                  color="linear-gradient(90deg,#ff8a00,#ffd23f)"
                  right={`${v.fullness} · ${v.fullness < 20 ? "배고파요" : v.fullness >= 80 ? "배불러요" : "적당해요"}`}
                />
                <Bar
                  label="🛁 청결도"
                  value={v.clean}
                  max={100}
                  color="linear-gradient(90deg,#00b7ff,#7df9ff)"
                  right={`${v.clean} · ${v.clean < 30 ? "꼬질꼬질" : v.clean >= 70 ? "반짝반짝" : "보통"}${v.clean >= CLEAN_BONUS_AT ? ` · 밥 +${CLEAN_BONUS_EXP}` : ""}`}
                />
                <Bar
                  label="💕 친밀도"
                  value={v.affection}
                  max={100}
                  color="linear-gradient(90deg,#ff2e88,#ff9ed2)"
                  right={`${v.affection} · ${v.bond}${v.nextBond ? ` · ${v.nextBond.name}까지 ${v.nextBond.left} (+${v.nextBond.points}P)` : v.affection >= BOND_BONUS_AT ? ` · 밥 +${BOND_BONUS_EXP}` : " · 최고 단계"}`}
                />
                {v.next ? (
                  <Bar
                    label={`✨ 다음 진화 · ${YOKAI[v.species].stages[v.next.stage]}`}
                    value={v.next.have}
                    max={v.next.need}
                    color="linear-gradient(90deg,#a87f35,#f5d76e)"
                    right={`${v.next.have} / ${v.next.need}`}
                  />
                ) : (
                  <p className="text-sm font-black text-[#f5d76e]">
                    ✨ 최종 진화 완료!
                  </p>
                )}
              </div>

              {viewingOther ? (
                <p
                  data-yokai-viewing
                  className="rounded-xl bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-200"
                >
                  👀 구경 중이에요. 밥 · 쓰다듬기 · 샤워는 ⭐ 대표 요괴만 할 수
                  있어요.
                </p>
              ) : yokai.tip ? (
                <p
                  data-yokai-tip
                  className="rounded-xl bg-[#c9a25c]/10 px-3 py-2 text-xs font-bold text-[#f3d9a4]"
                >
                  {yokai.tip}
                </p>
              ) : null}

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      key: "feed",
                      icon: "🍙",
                      label: "밥 주기",
                      count: `${feedsLeft}/${yokai.feeds.allowed}`,
                      wait: feedsLeft > 0 ? feedWait : null,
                      waitLabel: "배불러요",
                      off: feedsLeft <= 0,
                      primary: true,
                    },
                    {
                      key: "pet",
                      icon: "🤚",
                      label: "쓰다듬기",
                      count: `${petsLeft}/${a.pets.max}`,
                      wait: petsLeft > 0 ? petWait : null,
                      waitLabel: "쉬는 중",
                      off: petsLeft <= 0,
                      primary: false,
                    },
                    {
                      key: "shower",
                      icon: "🛁",
                      label: "샤워",
                      count:
                        a.clean < 30
                          ? "꼬질"
                          : a.clean < SHOWER_BELOW
                            ? "가능"
                            : "깨끗",
                      wait: showerWait,
                      waitLabel: "깨끗해요",
                      off: false,
                      primary: a.clean < 30,
                    },
                  ] as const
                ).map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    data-yokai-feed={b.key === "feed" ? "" : undefined}
                    data-yokai-pet={b.key === "pet" ? "" : undefined}
                    data-yokai-shower={b.key === "shower" ? "" : undefined}
                    disabled={
                      busy || (!viewingOther && (b.off || Boolean(b.wait)))
                    }
                    onClick={() =>
                      viewingOther && v
                        ? setConfirmMain(v.species)
                        : void act({ action: b.key })
                    }
                    className={cn(
                      "grid min-h-[86px] place-items-center content-center gap-0.5 rounded-2xl border px-1 py-2 text-center transition active:scale-[0.97] disabled:opacity-45",
                      // 밥 줄 수 있고 배가 고프면(포만감 50 미만) 반짝반짝
                      b.key === "feed" && !viewingOther && !b.off && !b.wait && (v?.fullness ?? 100) < 50 && "yokai-feed-glow",
                      b.primary
                        ? "border-[#b33] bg-[#7a1c22] text-white hover:bg-[#93242c]"
                        : "border-[#c9a25c]/40 bg-black/40 text-white hover:border-[#c9a25c]",
                    )}
                  >
                    <span className="text-2xl leading-none">{b.icon}</span>
                    <span className="text-sm font-black">{b.label}</span>
                    {viewingOther ? (
                      <span className="text-[10px] font-bold text-sky-200">
                        대표 요괴만
                      </span>
                    ) : b.wait && now != null ? (
                      <span
                        data-yokai-wait={b.key}
                        className="grid text-[10px] font-bold leading-tight text-[#ffd9a0]"
                      >
                        <span>{b.waitLabel}</span>
                        <span className="whitespace-nowrap">
                          {waitText(b.wait, new Date(now))} 뒤
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold tabular-nums text-[#e7c98a]">
                        {b.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {note ? (
                <p className="text-sm font-bold text-rose-300">{note}</p>
              ) : null}

              <Link
                href="/shop"
                data-yokai-mark-collection={markCollection}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-[#c9a25c]/40 bg-black/30 px-3 text-sm font-bold text-[#ffe08a]"
              >
                📖 요괴 마크 도감 {markCollection}/{VILLAGE_ALL_MARKS.length}
                <span className="ml-auto text-xs text-zinc-400">
                  {markCollection >= VILLAGE_ALL_MARKS.length ? "👑 촌장 달성!" : "다 모으면 촌장 마크 →"}
                </span>
              </Link>

              <details
                data-yokai-sources
                className="group rounded-xl bg-black/30 px-3 py-2 text-xs"
              >
                <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 font-bold text-[#e7c98a] [&::-webkit-details-marker]:hidden">
                  🍙 오늘 밥 받는 법 · 간식
                  <span className="ml-auto text-[11px] text-zinc-400 group-open:hidden">
                    펼치기
                  </span>
                </summary>
                <ul className="grid gap-1.5 pb-1 pt-1">
                  <li>
                    ✅ 기본 1번 (밥 1번 = 경험치 +{FEED.exp}, 깨끗하면 +
                    {FEED.exp + CLEAN_BONUS_EXP}, 💕 영혼의 단짝이면 +{BOND_BONUS_EXP} 더)
                  </li>
                  <li>
                    {yokai.feeds.sources.attended ? "✅" : "⬜"} 출석체크{" "}
                    {!yokai.feeds.sources.attended ? (
                      <Link
                        href="/attendance"
                        className="font-bold text-[#c9a25c] underline"
                      >
                        하러 가기
                      </Link>
                    ) : null}
                  </li>
                  <li>
                    {yokai.feeds.sources.quiz ? "✅" : "⬜"} 오늘의 퀴즈 정답{" "}
                    {!yokai.feeds.sources.quiz ? (
                      <Link
                        href="/quiz"
                        className="font-bold text-[#c9a25c] underline"
                      >
                        풀러 가기
                      </Link>
                    ) : null}
                  </li>
                  <li>
                    {yokai.feeds.sources.posted ? "✅" : "⬜"} 글 1개 쓰기{" "}
                    {!yokai.feeds.sources.posted ? (
                      <Link
                        href="/boards/free/write"
                        className="font-bold text-[#c9a25c] underline"
                      >
                        글쓰러 가기
                      </Link>
                    ) : null}
                  </li>
                  <li>
                    {yokai.feeds.sources.commented ? "✅" : "⬜"} 댓글 1개 쓰기{" "}
                    {!yokai.feeds.sources.commented ? (
                      <Link
                        href="/boards/free"
                        className="font-bold text-[#c9a25c] underline"
                      >
                        자유게시판
                      </Link>
                    ) : null}
                  </li>
                  <li className="flex flex-wrap items-center gap-1.5">
                    🍡 간식(포인트로 밥 1번 더) {yokai.snacks.used}/
                    {yokai.snacks.max}
                    <button
                      type="button"
                      data-yokai-snack
                      disabled={
                        busy ||
                        yokai.snacks.used >= yokai.snacks.max ||
                        yokai.points < yokai.snacks.price
                      }
                      onClick={() => void act({ action: "snack" })}
                      className="min-h-8 rounded-lg border border-[#c9a25c]/50 px-2 text-[11px] font-black text-[#e7c98a] disabled:opacity-50"
                    >
                      {yokai.snacks.used >= yokai.snacks.max
                        ? "오늘은 다 샀어요"
                        : `${yokai.snacks.price}P에 사기`}
                    </button>
                    <span className="text-zinc-500">
                      내 포인트 {yokai.points.toLocaleString()}P
                    </span>
                  </li>
                </ul>
              </details>
            </div>
          </section>

          <PushAlertToggle
            api="/api/yokai/alert"
            label="요괴가 배고프면 알림(저녁 7시)"
            onMessage="요괴가 배고플 때 저녁 7시에 알려 드릴게요."
            data="yokai"
          />

          <section
            aria-label="내 요괴들"
            data-yokai-owned
            className="ink-panel grid gap-2 rounded-2xl p-4"
          >
            <div className="grid gap-0.5">
              <h2 className="text-base font-black text-[#f3d9a4]">
                내 요괴들{" "}
                <span className="text-sm text-zinc-400">
                  {yokai.owned.length}마리
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                눌러서 구경 · 밥 · 쓰다듬기 · 샤워는 ⭐ 대표 요괴만
              </p>
            </div>
            {/* 줄바꿈으로 화면 폭에 맞춤(옆으로 넘기지 않음) */}
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {yokai.owned.map((o) => (
                <button
                  key={o.species}
                  type="button"
                  data-yokai-owned-item={o.species}
                  aria-pressed={o.species === v?.species}
                  onClick={() => {
                    setViewing(o.species === a.species ? null : o.species);
                    setReaction(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={cn(
                    "relative grid min-w-0 justify-items-center gap-0.5 overflow-hidden rounded-xl border bg-black/30 p-1.5 text-center text-[11px]",
                    FRAME[YOKAI[o.species].rarity],
                    o.species === v?.species && "ring-2 ring-[#e7c98a]",
                  )}
                >
                  {yokai.main === o.species ? (
                    <span className="absolute left-1 top-0.5 z-10 text-xs">
                      ⭐
                    </span>
                  ) : null}
                  {/* eslint-disable-next-line @next/next/no-img-element -- 가진 요괴 */}
                  <img
                    src={yokaiImage(o.species, o.stage)}
                    alt=""
                    className="aspect-square w-full object-contain"
                  />
                  <span className="max-w-full truncate font-bold text-white">
                    {YOKAI[o.species].name}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {o.stage}단계
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section
            aria-label="마을 배경"
            data-yokai-bg-shop
            className="ink-panel grid gap-2 rounded-2xl p-4"
          >
            <h2 className="flex flex-wrap items-baseline gap-2 text-base font-black text-[#f3d9a4]">
              마을 배경{" "}
              <span className="text-sm text-zinc-400">
                포인트로 바로 사요 · 내 포인트 {yokai.points.toLocaleString()}P
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(YOKAI_BACKGROUNDS) as YokaiBackground[]).map(
                (id) => {
                  const bg = YOKAI_BACKGROUNDS[id];
                  const owned = yokai.bg.owned.includes(id);
                  const using = yokai.bg.active === id;
                  // 새 그림이 아직 없는 배경은 판매 쉬는 중(산 배경은 그대로 씀)
                  const soon = !owned && !bgReady(id);
                  return (
                    <div
                      key={id}
                      data-yokai-bg={id}
                      className={cn(
                        "grid gap-1.5 rounded-xl border p-1.5",
                        using ? "border-[#e7c98a]" : "border-[#c9a25c]/25",
                      )}
                    >
                      <button
                        type="button"
                        data-yokai-bg-thumb={id}
                        aria-label={`${bg.name} 미리보기`}
                        disabled={soon}
                        onClick={() => {
                          setPreviewBg(owned || using ? null : id);
                          if (owned && !using)
                            void act({ action: "useBg", bg: id });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={cn(
                          "relative grid aspect-[4/3] place-items-center overflow-hidden rounded-lg",
                          previewBg === id && "ring-2 ring-[#f5d76e]",
                        )}
                        style={{ background: bgCss(id) }}
                      >
                        {soon ? (
                          <span className="rounded-full bg-black/70 px-2 py-1 text-[11px] font-black text-[#f3d9a4]">
                            🎨 새 그림 준비 중
                          </span>
                        ) : null}
                      </button>
                      <div className="flex items-center gap-1 text-xs">
                        <b className="text-white">{bg.name}</b>
                        <span className="ml-auto text-zinc-400">
                          {owned
                            ? "가짐"
                            : soon
                              ? "곧 열려요"
                              : `${bg.price.toLocaleString()}P`}
                        </span>
                      </div>
                      <button
                        type="button"
                        data-yokai-bg-action={owned ? "use" : "buy"}
                        disabled={
                          busy ||
                          using ||
                          soon ||
                          (!owned && yokai.points < bg.price)
                        }
                        onClick={() =>
                          void act({
                            action: owned ? "useBg" : "buyBg",
                            bg: id,
                          })
                        }
                        className={cn(
                          "min-h-9 rounded-lg text-xs font-black disabled:opacity-50",
                          owned
                            ? "border border-[#c9a25c]/50 text-[#e7c98a]"
                            : "bg-[#7a1c22] text-white",
                        )}
                      >
                        {using
                          ? "쓰는 중"
                          : owned
                            ? "쓰기"
                            : soon
                              ? "준비 중"
                              : yokai.points < bg.price
                                ? "포인트 부족"
                                : "사기"}
                      </button>
                    </div>
                  );
                },
              )}
            </div>
            <p className="text-[11px] text-zinc-500">
              새 도트 배경 6종! 그림을 누르면 내 요괴 뒤에 미리 깔아 볼 수
              있어요. 전설 요괴(구미호 · 염라대왕)를 키울 때는 전용 배경이 먼저
              보여요.
            </p>
          </section>

          <section
            aria-label="진화 단계"
            data-yokai-evo
            className="ink-panel grid gap-2 rounded-2xl p-4"
          >
            <h2 className="text-base font-black text-[#f3d9a4]">진화 단계</h2>
            <div className="grid grid-cols-5 gap-1.5">
              {YOKAI[v.species].stages.map((label, i) => {
                const open = i + 1 <= v.stage;
                return (
                  <div
                    key={label}
                    className="grid justify-items-center gap-1 text-center text-[11px] text-zinc-400"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- 아직이면 실루엣 */}
                    <img
                      src={yokaiImage(v.species, i + 1)}
                      alt=""
                      className={cn(
                        "aspect-square w-full object-contain",
                        !open && "opacity-30 brightness-0",
                      )}
                    />
                    <span className={cn(open && "font-bold text-white")}>
                      {open ? label : "???"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            aria-label="요괴 도감"
            data-yokai-dex
            className="ink-panel grid gap-2 rounded-2xl p-4"
          >
            <h2 className="text-base font-black text-[#f3d9a4]">
              요괴 도감{" "}
              <span className="text-sm text-zinc-400">
                {yokai.dex.length} / 108
              </span>
            </h2>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 sm:gap-2 lg:grid-cols-9">
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
                    className={cn(
                      "relative grid justify-items-center gap-0.5 overflow-hidden rounded-xl border bg-black/30 p-1.5 text-center text-[11px]",
                      FRAME[def.rarity],
                      dexPick === s && "ring-2 ring-[#e7c98a]",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- 못 만난 요괴는 실루엣 */}
                    <img
                      src={yokaiImage(s, 1)}
                      alt=""
                      className={cn(
                        "aspect-square w-full object-contain",
                        !have && "opacity-30 brightness-0",
                      )}
                    />
                    <span
                      className={cn(
                        "max-w-full truncate text-[10px] tracking-tight sm:text-[11px] sm:tracking-normal",
                        have ? "font-bold text-white" : "text-zinc-500",
                      )}
                    >
                      {have ? def.name : "???"}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        RARITY_TEXT[def.rarity],
                      )}
                    >
                      {RARITY_LABEL[def.rarity]}
                    </span>
                  </button>
                );
              })}
            </div>
            {dexPick ? <DexDetail species={dexPick} yokai={yokai} /> : null}
            <p className="text-[11px] text-zinc-500">
              칸을 누르면 얻는 방법과 지금 진행도가 보여요.
            </p>
          </section>
        </>
      )}

      {/* 팝업은 화면 맨 위(머리줄 위)에 그림 · 화면이 뜬 뒤에만 */}
      {now != null
        ? createPortal(
            <>
              {arriving ? (
                <div
                  role="dialog"
                  aria-label="새 요괴 등장"
                  data-yokai-arrival={arriving}
                  className="fixed inset-0 z-[200] grid place-items-center bg-black/85 p-4"
                >
                  <div
                    className="grid w-full max-w-sm justify-items-center gap-3 overflow-hidden rounded-3xl border p-5 text-center"
                    style={{
                      background: stageBackground(arriving),
                      borderColor:
                        YOKAI[arriving].rarity === "legend"
                          ? "#f5d76e"
                          : YOKAI[arriving].rarity === "hero"
                            ? "#d9dde6"
                            : "rgba(201,162,92,.4)",
                    }}
                  >
                    <p
                      className={cn(
                        "text-sm font-black",
                        RARITY_TEXT[YOKAI[arriving].rarity],
                      )}
                    >
                      {YOKAI[arriving].rarity === "legend"
                        ? "✨ 전설의 요괴가 나타났어요! ✨"
                        : YOKAI[arriving].rarity === "hero"
                          ? "영웅 요괴가 찾아왔어요!"
                          : "새 요괴가 찾아왔어요!"}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 등장 */}
                    <img
                      src={yokaiImage(
                        arriving,
                        YOKAI[arriving].rarity === "legend" ? 5 : 1,
                      )}
                      alt=""
                      className="w-60 max-w-[65vw] object-contain drop-shadow-[0_0_30px_rgba(245,215,110,.45)]"
                      style={{
                        animation: `yk-rise ${YOKAI[arriving].rarity === "legend" ? 1.6 : 0.9}s ease-out both`,
                      }}
                    />
                    <p className="text-2xl font-black text-white">
                      {YOKAI[arriving].name}
                    </p>
                    <p className="text-sm text-[#ece4d6]">
                      {YOKAI[arriving].intro}
                    </p>
                    {YOKAI[arriving].rarity === "legend" ? (
                      <p className="text-xs text-[#f5d76e]">
                        처음 만난 모습은 1단계예요. 키우면 이 모습이 돼요.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      data-yokai-arrival-ok
                      onClick={() => {
                        if (
                          arrivalIndex + 1 >=
                          (yokai?.newcomers.length ?? 0)
                        ) {
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

              {confirmMain && yokai ? (
                <div
                  role="dialog"
                  aria-label="대표 요괴 바꾸기"
                  data-yokai-confirm-main
                  className="fixed inset-0 z-[200] grid place-items-center bg-black/80 p-4"
                  onClick={() => setConfirmMain(null)}
                >
                  <div
                    className="grid w-full max-w-sm gap-3 rounded-3xl border border-[#c9a25c]/50 bg-[#17100d] p-5 text-center"
                    onClick={(e) => e.stopPropagation()}
                    style={{ animation: "yk-pop .25s ease-out both" }}
                  >
                    <div className="flex items-end justify-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 지금 대표 */}
                      <img
                        src={yokaiImage(
                          yokai.active.species,
                          yokai.active.stage,
                        )}
                        alt=""
                        className="size-16 object-contain opacity-60"
                      />
                      <span className="pb-5 text-lg text-[#c9a25c]">→</span>
                      {/* eslint-disable-next-line @next/next/no-img-element -- 새 대표 */}
                      <img
                        src={yokaiImage(
                          confirmMain,
                          yokai.owned.find((o) => o.species === confirmMain)
                            ?.stage ?? 1,
                        )}
                        alt=""
                        className="size-24 object-contain"
                      />
                    </div>
                    <p className="text-lg font-black text-white">
                      대표 요괴를 {YOKAI[confirmMain].name}(으)로 바꿀까요?
                    </p>
                    <ul className="grid gap-1 rounded-xl bg-black/40 p-3 text-left text-xs text-[#ece4d6]">
                      <li>
                        {confirmCost ? (
                          <>
                            💰{" "}
                            <b className="text-[#f5d76e]">
                              {confirmCost}P가 차감돼요
                            </b>{" "}
                            (내 포인트 {yokai.points.toLocaleString()}P)
                          </>
                        ) : (
                          <>
                            🎁{" "}
                            <b className="text-emerald-300">
                              처음 대표로 정하는 요괴라 무료예요
                            </b>{" "}
                            (다음부터는 {yokai.mainChangeCost}P)
                          </>
                        )}
                      </li>
                      <li>
                        🍙 밥 · 🤚 쓰다듬기 · 🛁 샤워는 대표 요괴만 할 수 있어요
                      </li>
                      <li>
                        ⏳ 쿨타임은 모든 요괴가 함께 써서, 바꿔도 초기화되지
                        않아요
                      </li>
                      <li>⭐ 닉네임 옆 · 프로필에도 새 대표 요괴가 보여요</li>
                    </ul>
                    {yokai.points < confirmCost ? (
                      <p className="text-xs font-bold text-rose-300">
                        포인트가 모자라요. 출석 · 미션으로 모아 주세요.
                      </p>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmMain(null)}
                        className="min-h-11 rounded-xl border border-white/20 text-sm font-bold text-zinc-200"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        data-yokai-confirm-main-ok
                        disabled={busy || yokai.points < confirmCost}
                        onClick={async () => {
                          const target = confirmMain;
                          setConfirmMain(null);
                          await act({ action: "main", species: target });
                          setViewing(null);
                        }}
                        className="min-h-11 rounded-xl bg-[#7a1c22] text-sm font-black text-white hover:bg-[#93242c] disabled:opacity-50"
                      >
                        {confirmCost
                          ? `${confirmCost}P 내고 바꾸기`
                          : "무료로 바꾸기"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {evolved && a && !arriving ? (
                <div
                  role="dialog"
                  aria-label="진화"
                  data-yokai-evolved
                  className="fixed inset-0 z-[200] grid place-items-center bg-black/80 p-4"
                  onClick={() => setEvolved(null)}
                >
                  <div
                    className="grid justify-items-center gap-3 text-center"
                    style={{ animation: "yk-glow .9s ease-out both" }}
                  >
                    <p className="text-lg font-black text-[#f5d76e]">
                      ✨ 진화했어요! ✨
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 새 모습 */}
                    <img
                      src={yokaiImage(a.species, evolved)}
                      alt=""
                      className="w-64 max-w-[70vw] object-contain drop-shadow-[0_0_30px_rgba(245,215,110,.45)]"
                    />
                    <p className="text-2xl font-black text-white">
                      {YOKAI[a.species].stages[evolved - 1]}
                    </p>
                    <p
                      data-yokai-evolve-line
                      className="max-w-xs rounded-2xl border border-[#f5d76e]/40 bg-black/50 px-4 py-2 text-sm font-bold text-[#f6efe2]"
                    >
                      「{pickLine(a.species, "evolve", evolved)}」
                    </p>
                    <button
                      type="button"
                      className="min-h-11 rounded-xl bg-[#c9a25c] px-6 text-sm font-black text-black"
                    >
                      좋아요!
                    </button>
                  </div>
                </div>
              ) : null}
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

/** 도감 칸을 눌렀을 때: 만난 요괴는 지금 모습 · 소개, 못 만난 요괴는 얻는 방법 · 진행도(구미호는 아홉 꼬리) */
function DexDetail({
  species,
  yokai,
}: {
  species: YokaiSpecies;
  yokai: YokaiView;
}) {
  const def = YOKAI[species];
  const owned = yokai.owned.find((o) => o.species === species);
  return (
    <div
      data-yokai-dex-detail
      className="grid gap-2 rounded-xl border border-[#c9a25c]/30 bg-black/40 p-3"
    >
      <div className="grid grid-cols-[72px_1fr] items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- 고른 요괴 */}
        <img
          src={yokaiImage(species, owned ? owned.stage : 1)}
          alt=""
          className={cn(
            "aspect-square w-full object-contain",
            !owned && "opacity-40 brightness-0",
          )}
        />
        <div className="grid gap-1 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <b className="text-white">{owned ? def.name : "???"}</b>
            <span className={cn("text-xs font-black", RARITY_TEXT[def.rarity])}>
              {RARITY_LABEL[def.rarity]}
            </span>
            {owned ? <ElementTag species={species} /> : null}
            {owned ? (
              <span className="text-xs text-zinc-400">
                {owned.stage}단계 · {def.stages[owned.stage - 1]}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[#d1c7b5]">
            {owned ? def.intro : def.how}
          </p>
          {!owned && yokai.progress[species] ? (
            <p data-yokai-progress className="text-xs font-bold text-[#e7c98a]">
              지금: {yokai.progress[species]}
            </p>
          ) : null}
        </div>
      </div>
      {species === "gumiho" && !owned ? (
        <ul
          data-yokai-tails
          className="grid gap-1 rounded-lg bg-black/30 p-2 text-xs sm:grid-cols-3"
        >
          {yokai.tails.map((t, i) => (
            <li
              key={t.label}
              className={cn(
                "flex items-center gap-1",
                t.done ? "text-[#f5d76e]" : "text-zinc-400",
              )}
            >
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
