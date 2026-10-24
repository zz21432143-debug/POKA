"use client";

import { useEffect, useState } from "react";
import { BellRingIcon, XIcon } from "lucide-react";
import { ensurePushSubscription, pushSupported } from "@/lib/push-client";

const DISMISS_KEY = "poka-daily-alert-dismiss";
/** 「나중에」를 누르면 이만큼 다시 묻지 않음 */
const DISMISS_DAYS = 7;

/**
 * 홈(회원만): 매일 알림을 아직 안 켠 기기에 한 줄 권유 — 퀴즈 · 출석 · 요괴 밥 시간을 한 번에 켜기.
 * 이미 켰거나 지원하지 않는 브라우저거나 「나중에」를 눌렀으면 안 보임.
 */
export function HomeAlertPrompt() {
  const pushKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [state, setState] = useState<"hidden" | "show" | "done">("hidden");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported(pushKey)) return;
    try {
      const until = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
      if (until > Date.now()) return;
    } catch {
      /* 저장소를 못 쓰면 그냥 보여 줌 */
    }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") return;
    let alive = true;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (!sub) return false;
        const res = await fetch(`/api/push/daily?endpoint=${encodeURIComponent(sub.endpoint)}`);
        return Boolean(((await res.json()) as { on?: boolean }).on);
      })
      .then((on) => alive && !on && setState("show"))
      .catch(() => alive && setState("show"));
    return () => {
      alive = false;
    };
  }, [pushKey]);

  function later() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    } catch {
      /* 무시 */
    }
    setState("hidden");
  }

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("알림 권한을 허용해 주세요. (브라우저 · 앱 설정에서 바꿀 수 있어요)");
      const sub = await ensurePushSubscription(pushKey);
      const res = await fetch("/api/push/daily", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "알림을 켜지 못했어요.");
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "알림을 켜지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "hidden") return null;
  if (state === "done")
    return (
      <p data-home-alert="done" className="rounded-2xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200">
        ✅ 알림을 켰어요. 퀴즈 · 출석 · 요괴 밥 시간을 알려 드릴게요.
      </p>
    );
  return (
    <section data-home-alert className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#c9a25c]/50 bg-[#c9a25c]/10 px-3 py-1 sm:px-4">
      <BellRingIcon aria-hidden className="size-4 shrink-0 text-[#ffcf4a]" />
      <p className="min-w-0 flex-1 truncate text-sm">
        <b className="text-[#f3d9a4]">알림 켜면 놓치지 않아요</b>
        <span className="hidden text-xs text-[#d9cfbd] sm:inline"> · 퀴즈 · 출석 1등 · 요괴 밥 시간</span>
      </p>
      <button type="button" data-home-alert-on disabled={busy} onClick={() => void turnOn()} className="min-h-9 shrink-0 rounded-full bg-[#ffcf4a] px-3.5 text-sm font-black text-[#2a1400] disabled:opacity-50">
        {busy ? "켜는 중…" : "🔔 알림 켜기"}
      </button>
      <button type="button" onClick={later} aria-label="나중에" className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-black/30">
        <XIcon className="size-4" />
      </button>
      {error ? <p className="basis-full text-xs text-rose-300">{error}</p> : null}
    </section>
  );
}
