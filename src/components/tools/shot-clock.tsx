"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Maximize2Icon,
  MinusIcon,
  RotateCwIcon,
  PlusIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";

/**
 * 샷클락: 플레이어마다 주는 생각 시간(초). 0.1초까지 보여 줌.
 * - 밀기(스와이프): 처음 시간으로 되돌리고 바로 다시 흐름(다음 플레이어)
 * - 누르기(탭): 멈춤 · 다시 누르면 이어서 흐름(0초면 처음부터 다시)
 * 서버를 쓰지 않음(설정은 이 기기에만 저장).
 */

const PRESETS = [10, 15, 20, 30, 45, 60] as const;
const MIN_SEC = 3;
const MAX_SEC = 300;
const STORE = "poka-shot-clock";
/** 밀기로 볼 최소 거리(px) */
const SWIPE_PX = 40;

type Theme = "dark" | "light" | "contrast";
const THEMES: { key: Theme; label: string; hint: string }[] = [
  { key: "dark", label: "다크", hint: "검정 바탕 · 흰 글씨" },
  {
    key: "contrast",
    label: "고대비",
    hint: "검정 바탕 · 노란 글씨(필름 · 반사에 가장 잘 보임)",
  },
  { key: "light", label: "라이트", hint: "흰 바탕 · 검정 글씨(밝은 곳)" },
];

/** 빨간 바탕 선택: 끝까지 기본색 · n초부터 */
const RED_CHOICES = [
  { sec: 0, label: "끝까지 기본색" },
  { sec: 3, label: "3초부터 빨간 바탕" },
  { sec: 5, label: "5초부터 빨간 바탕" },
  { sec: 10, label: "10초부터 빨간 바탕" },
] as const;

type Settings = {
  seconds: number;
  theme: Theme;
  sound: boolean;
  vibrate: boolean;
  /** 빨간 바탕으로 바뀌는 남은 초(0 = 끝까지 기본색) */
  redAt: number;
  /** 가로 보기: 휴대폰을 세워 둬도 숫자를 옆으로 눕혀 크게 */
  landscape: boolean;
};
const DEFAULTS: Settings = {
  seconds: 30,
  theme: "dark",
  sound: false,
  vibrate: true,
  redAt: 0,
  landscape: false,
};

function loadSettings(): Settings {
  try {
    const raw = JSON.parse(
      window.localStorage.getItem(STORE) ?? "{}",
    ) as Partial<Settings>;
    const seconds = Math.round(Number(raw.seconds));
    return {
      seconds:
        seconds >= MIN_SEC && seconds <= MAX_SEC ? seconds : DEFAULTS.seconds,
      theme: THEMES.some((t) => t.key === raw.theme)
        ? (raw.theme as Theme)
        : DEFAULTS.theme,
      sound: typeof raw.sound === "boolean" ? raw.sound : DEFAULTS.sound,
      vibrate:
        typeof raw.vibrate === "boolean" ? raw.vibrate : DEFAULTS.vibrate,
      redAt: RED_CHOICES.some((c) => c.sec === Number(raw.redAt))
        ? Number(raw.redAt)
        : DEFAULTS.redAt,
      landscape:
        typeof raw.landscape === "boolean" ? raw.landscape : DEFAULTS.landscape,
    };
  } catch {
    return DEFAULTS;
  }
}

/** 9.2 · 30.0처럼 소수 첫째 자리까지(남은 시간은 올림이 아니라 내림 — 0.0이 되는 순간 끝) */
export function formatShot(ms: number) {
  const tenths = Math.max(0, Math.floor(ms / 100));
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}

/** 큰 글씨(초)와 작은 글씨(.소수)로 나눔: 9.2 → ["9", ".2"] */
export function shotParts(ms: number) {
  const tenths = Math.max(0, Math.floor(ms / 100));
  return [String(Math.floor(tenths / 10)), `.${tenths % 10}`] as const;
}

/** 남은 시간에 따른 단계: 넉넉 · 빨강(redAt초 이하, 0이면 없음) · 끝 */
export function shotStage(ms: number, redAt: number) {
  if (ms <= 0) return "over" as const;
  if (redAt > 0 && ms <= redAt * 1000) return "red" as const;
  return "ok" as const;
}

let audio: AudioContext | null = null;
function beep(freq: number, ms: number) {
  try {
    audio ??= new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + ms / 1000);
  } catch {
    // 소리를 못 내는 기기면 그냥 둠
  }
}

export function ShotClock() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  /** 남은 시간(ms) — 멈춰 있을 때 기준 */
  const [left, setLeft] = useState(DEFAULTS.seconds * 1000);
  const [running, setRunning] = useState(false);
  const [big, setBig] = useState(false);
  /** 흐르는 동안 화면에 보여 줄 남은 시간(ms) — 매 프레임 갱신 */
  const [shown, setShown] = useState(DEFAULTS.seconds * 1000);
  const endAt = useRef(0);
  /** 시계 칸 크기(px): 숫자를 칸에 꽉 차게 */
  const faceRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 360, h: 480 });
  const lastWhole = useRef<number | null>(null);

  useEffect(() => {
    const s = loadSettings();
    // 저장된 설정은 화면이 뜬 뒤 읽음(서버 그림과 어긋나지 않게)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(s);
    setLeft(s.seconds * 1000);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORE, JSON.stringify(settings));
    } catch {
      // 저장 못 하면 이번만 씀
    }
  }, [settings, loaded]);

  const remaining = running ? shown : left;
  const stage = shotStage(remaining, settings.redAt);

  // 흐르는 동안: 화면 갱신 + 알림(남은 초가 바뀔 때)
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = () => {
      const ms = endAt.current - performance.now();
      if (ms <= 0) {
        setRunning(false);
        setLeft(0);
        if (settings.vibrate) navigator.vibrate?.([400, 120, 400]);
        if (settings.sound) beep(880, 600);
        return;
      }
      const whole = Math.ceil(ms / 1000);
      if (whole !== lastWhole.current) {
        lastWhole.current = whole;
        if (whole <= 5) {
          if (settings.vibrate) navigator.vibrate?.(60);
          if (settings.sound) beep(660, 90);
        }
      }
      setShown(ms);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, settings.vibrate, settings.sound]);

  // 화면 꺼짐 막기(지원하는 기기만)
  useEffect(() => {
    if (!big && !running) return;
    let lock: { release: () => Promise<void> } | null = null;
    let gone = false;
    const take = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: {
            request: (t: "screen") => Promise<{ release: () => Promise<void> }>;
          };
        };
        const l = await nav.wakeLock?.request("screen");
        if (gone) void l?.release();
        else lock = l ?? null;
      } catch {
        // 지원 안 하면 그냥 둠
      }
    };
    void take();
    const again = () => {
      if (document.visibilityState === "visible") void take();
    };
    document.addEventListener("visibilitychange", again);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", again);
      void lock?.release();
    };
  }, [big, running]);

  const start = useCallback((ms: number) => {
    endAt.current = performance.now() + ms;
    lastWhole.current = Math.ceil(ms / 1000);
    setShown(ms);
    setRunning(true);
  }, []);

  /** 밀기: 처음 시간으로 되돌리고 바로 흐름 */
  const resetAndGo = useCallback(() => {
    if (settings.vibrate) navigator.vibrate?.(30);
    setLeft(settings.seconds * 1000);
    start(settings.seconds * 1000);
  }, [settings.seconds, settings.vibrate, start]);

  /** 누르기: 멈춤 · 이어서(0초면 처음부터) */
  const toggle = useCallback(() => {
    if (running) {
      setLeft(Math.max(0, endAt.current - performance.now()));
      setRunning(false);
      return;
    }
    start(left > 0 ? left : settings.seconds * 1000);
    if (left <= 0) setLeft(settings.seconds * 1000);
  }, [running, left, settings.seconds, start]);

  // 손가락: 움직인 거리로 밀기/누르기 구분
  const down = useRef<{ x: number; y: number; id: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d || d.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (moved >= SWIPE_PX) resetAndGo();
    else toggle();
  };

  // 키보드(블루투스 버튼 · PC): 스페이스 = 멈춤/이어서, 엔터 · → = 처음부터 다시
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input, select, textarea"))
        return;
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (
        e.key === "Enter" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowLeft"
      ) {
        e.preventDefault();
        resetAndGo();
      } else if (e.key === "Escape") setBig(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, resetAndGo]);

  const setSeconds = (value: number) => {
    const sec = Math.min(MAX_SEC, Math.max(MIN_SEC, Math.round(value)));
    setSettings((s) => ({ ...s, seconds: sec }));
    if (!running) setLeft(sec * 1000);
  };

  const openBig = async () => {
    setBig(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // 전체 화면이 안 되는 브라우저(아이폰 사파리 등)는 화면 꽉 채우기만
    }
  };
  const closeBig = async () => {
    setBig(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // 무시
    }
  };
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setBig(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // 시계 칸 크기 따라가기(꽉 채우기 · 화면 돌림)
  useEffect(() => {
    const el = faceRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [big]);

  // 색: 테마 그대로, 빨간 바탕을 골랐으면 그 초부터만 바탕이 통째로 빨강(필름 너머로도 보이게)
  const flashOn = settings.redAt > 0 && (stage === "red" || stage === "over");
  const tone = (() => {
    const t = settings.theme;
    if (flashOn)
      return stage === "over"
        ? "bg-red-600 text-white"
        : "bg-red-700 text-white";
    if (t === "light") return "bg-white text-black";
    if (t === "contrast") return "bg-black text-yellow-300";
    return "bg-black text-white";
  })();
  const total = settings.seconds * 1000;
  const ratio = Math.max(0, Math.min(1, remaining / total));
  // 안내 글은 시작 전에만(흐르는 동안은 숫자만)
  const idle = !running && remaining === total;
  const hint = idle ? "밀면 시작 · 누르면 멈춤" : "";
  // 가로 보기: 화면이 세로일 때만 숫자를 90도 눕힘(이미 가로면 그대로)
  const rotate = settings.landscape && box.h > box.w;
  const W = rotate ? box.h : box.w;
  const H = rotate ? box.w : box.h;
  // 큰 숫자(초) 자리 수는 설정 시간 기준(10초 → 9초가 돼도 크기가 튀지 않게)
  const digits = String(settings.seconds).length;
  const SMALL = 0.36;
  const mainPx = Math.max(
    40,
    Math.min((W * 0.94) / (digits * 0.6 + 0.95 * SMALL), H * 0.74),
  );
  const [whole, frac] = shotParts(remaining);

  const face = (
    <div
      data-shot-face
      role="button"
      tabIndex={0}
      ref={faceRef}
      aria-label={`샷클락 ${formatShot(remaining)}초${hint ? ` · ${hint}` : ""}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        down.current = null;
      }}
      className={cn(
        "relative grid touch-none select-none place-items-center overflow-hidden transition-colors duration-150",
        tone,
        big
          ? "fixed inset-0 z-[2147483000]"
          : "min-h-[52dvh] rounded-2xl border border-white/15",
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        data-shot-rotated={rotate ? "1" : undefined}
        className="absolute top-1/2 left-1/2 grid place-items-center"
        style={{
          width: W,
          height: H,
          transform: `translate(-50%, -50%)${rotate ? " rotate(90deg)" : ""}`,
        }}
      >
        {/* 남은 시간 막대(바탕에 크게): 글자가 흐려도 막대 길이로 보임 */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 bottom-0 origin-left",
            flashOn
              ? "bg-white/25"
              : settings.theme === "light"
                ? "bg-black/10"
                : "bg-white/15",
          )}
          style={{ height: "7%", transform: `scaleX(${ratio})` }}
        />
        <span
          data-shot-time
          aria-hidden
          className="flex items-baseline font-black leading-none tracking-tight tabular-nums"
          style={{
            fontSize: mainPx,
            // 필름 너머로도 또렷하게: 굵은 글자 + 테두리
            WebkitTextStroke:
              settings.theme === "light" && !flashOn
                ? "0"
                : "0.012em currentColor",
          }}
        >
          {/* 초는 아주 크게, .소수는 작게 */}
          <span data-shot-whole>{whole}</span>
          <span data-shot-frac style={{ fontSize: `${SMALL}em` }}>
            {frac}
          </span>
        </span>
        {hint ? (
          <span
            data-shot-hint
            className={cn(
              "absolute left-0 right-0 text-center font-black opacity-80",
              big ? "top-16 text-2xl" : "top-3 text-base",
            )}
          >
            {hint}
          </span>
        ) : null}
        {!running && remaining > 0 && remaining < total ? (
          <span className="absolute bottom-[16%] left-0 right-0 text-center text-xl font-black opacity-90">
            ⏸
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="grid gap-3">
      {big
        ? // 사이트 머리 · 아래 메뉴 위로(아이폰처럼 전체 화면이 안 되는 기기도 꽉 차게)
          createPortal(
            <>
              {face}
              {/* 흐르는 동안은 숫자만(멈추거나 끝나면 버튼이 나옴) */}
              <div
                hidden={running}
                data-shot-top
                className="fixed top-2 right-2 z-[2147483001] flex gap-2"
              >
                <button
                  type="button"
                  aria-label="가로 보기"
                  aria-pressed={settings.landscape}
                  onClick={() =>
                    setSettings((s) => ({ ...s, landscape: !s.landscape }))
                  }
                  className="grid min-h-12 min-w-12 place-items-center rounded-xl bg-black/60 text-white ring-1 ring-white/30"
                >
                  <RotateCwIcon className="size-6" />
                </button>
                <button
                  type="button"
                  aria-label="크게 보기 닫기"
                  onClick={() => void closeBig()}
                  className="grid min-h-12 min-w-12 place-items-center rounded-xl bg-black/60 text-white ring-1 ring-white/30"
                >
                  <XIcon className="size-6" />
                </button>
              </div>
            </>,
            document.body,
          )
        : face}

      {/* 설정 */}
      <section
        aria-label="샷클락 설정"
        className="grid gap-3 rounded-2xl border border-white/15 bg-zinc-950 p-3"
      >
        <div className="grid gap-1.5">
          <span className="text-sm font-black text-zinc-200">
            플레이어당 시간(초)
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-label="1초 줄이기"
              onClick={() => setSeconds(settings.seconds - 1)}
              className="grid size-12 place-items-center rounded-xl border border-white/25"
            >
              <MinusIcon className="size-5" />
            </button>
            <input
              aria-label="초"
              data-shot-seconds
              type="number"
              inputMode="numeric"
              min={MIN_SEC}
              max={MAX_SEC}
              value={settings.seconds}
              onChange={(e) => setSeconds(Number(e.target.value) || MIN_SEC)}
              className="h-12 w-24 rounded-xl border border-white/25 bg-black px-2 text-center text-2xl font-black text-white"
            />
            <button
              type="button"
              aria-label="1초 늘리기"
              onClick={() => setSeconds(settings.seconds + 1)}
              className="grid size-12 place-items-center rounded-xl border border-white/25"
            >
              <PlusIcon className="size-5" />
            </button>
            {PRESETS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSeconds(sec)}
                className={cn(
                  "min-h-12 rounded-xl px-3 text-base font-black",
                  settings.seconds === sec
                    ? "bg-amber-400 text-black"
                    : "border border-white/25 text-zinc-200",
                )}
              >
                {sec}초
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-black text-zinc-200">화면</span>
          <div className="grid grid-cols-3 gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                data-shot-theme={t.key}
                onClick={() => setSettings((s) => ({ ...s, theme: t.key }))}
                className={cn(
                  "grid min-h-14 content-center gap-0.5 rounded-xl px-2 text-center",
                  t.key === "light"
                    ? "bg-white text-black"
                    : t.key === "contrast"
                      ? "bg-black text-yellow-300"
                      : "bg-black text-white",
                  settings.theme === t.key
                    ? "ring-4 ring-amber-400"
                    : "ring-1 ring-white/25",
                )}
              >
                <b className="text-base">{t.label}</b>
                <span className="text-[10px] leading-tight opacity-80">
                  {t.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 text-sm font-bold">
          {/* 빨간 바탕: 고를 때만(그 전까지는 고른 화면 색 그대로) */}
          <div data-shot-red className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-4">
            {RED_CHOICES.map((c) => (
              <button
                key={c.sec}
                type="button"
                data-red-at={c.sec}
                aria-pressed={settings.redAt === c.sec}
                onClick={() => setSettings((s) => ({ ...s, redAt: c.sec }))}
                className={cn(
                  "min-h-11 rounded-xl px-2",
                  settings.redAt === c.sec
                    ? c.sec
                      ? "bg-red-700 text-white ring-2 ring-amber-400"
                      : "bg-zinc-200 text-black ring-2 ring-amber-400"
                    : "border border-white/20 text-zinc-300",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={settings.vibrate}
            onClick={() => setSettings((s) => ({ ...s, vibrate: !s.vibrate }))}
            className={cn(
              "min-h-11 rounded-xl px-3",
              settings.vibrate
                ? "bg-zinc-200 text-black"
                : "border border-white/20 text-zinc-300",
            )}
          >
            진동 {settings.vibrate ? "켬" : "끔"}
          </button>
          <button
            type="button"
            aria-pressed={settings.sound}
            onClick={() => {
              if (!settings.sound) beep(660, 60);
              setSettings((s) => ({ ...s, sound: !s.sound }));
            }}
            className={cn(
              "flex min-h-11 items-center gap-1 rounded-xl px-3",
              settings.sound
                ? "bg-zinc-200 text-black"
                : "border border-white/20 text-zinc-300",
            )}
          >
            {settings.sound ? (
              <Volume2Icon className="size-4" />
            ) : (
              <VolumeXIcon className="size-4" />
            )}
            소리 {settings.sound ? "켬" : "끔"}
          </button>
          <button
            type="button"
            data-shot-landscape
            aria-pressed={settings.landscape}
            onClick={() =>
              setSettings((s) => ({ ...s, landscape: !s.landscape }))
            }
            className={cn(
              "flex min-h-11 items-center gap-1 rounded-xl px-3",
              settings.landscape
                ? "bg-zinc-200 text-black"
                : "border border-white/20 text-zinc-300",
            )}
          >
            <RotateCwIcon className="size-4" />
            가로 보기 {settings.landscape ? "켬" : "끔"}
          </button>
          <button
            type="button"
            data-shot-big
            onClick={() => void openBig()}
            className="ml-auto flex min-h-11 items-center gap-1 rounded-xl bg-amber-400 px-4 font-black text-black"
          >
            <Maximize2Icon className="size-4" />
            화면 꽉 채우기
          </button>
        </div>

        <ul className="grid gap-1 rounded-xl bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-300">
          <li>
            <b className="text-white">밀기</b> → 처음 시간으로 돌아가 바로 다시
            흐름(다음 플레이어) · <b className="text-white">누르기</b> → 멈춤,
            다시 누르면 이어서
          </li>
          <li>
            <b className="text-white">필름 때문에 잘 안 보일 때:</b> 「고대비」
            화면 + 「화면 꽉 채우기」 + 화면 밝기 최대. 「n초부터 빨간 바탕」을
            고르면 그 초부터 바탕이 통째로 빨개지고(그 전까지는 기본색), 아래
            막대도 줄어 글자가 흐려도 알아볼 수 있어요. 반사가 심하면 무광(저반사)
            필름이 가장 잘 보입니다.
          </li>
          <li>
            화면 꽉 채우기 동안은 화면이 꺼지지 않아요(지원하는 기기). 블루투스
            리모컨 · 키보드: 스페이스 = 멈춤/이어서, 엔터 · 화살표 = 처음부터.
          </li>
          <li>설정은 이 기기에만 저장되고 서버에는 아무것도 보내지 않아요.</li>
        </ul>
      </section>
    </div>
  );
}
