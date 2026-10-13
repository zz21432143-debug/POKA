"use client";

import { useEffect, useState } from "react";
import { BellRingIcon, XIcon } from "lucide-react";
import { ALL_REGIONS, JOB_REGIONS } from "@/lib/job-status";
import { ensurePushSubscription, pushSupported } from "@/lib/push-client";

const REGION_KEY = "poka-alert-region";
const LATER_KEY = "poka-alert-prompt-later";

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* 저장소를 못 쓰면 이번만 */
  }
}

/** 설치한 앱(홈 화면에서 연 POKA)인지 */
function isInstalledApp() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

/**
 * 앱을 설치한 사람에게 "급구 알림 받기"를 한 번 물어봅니다(지역 · 전국 고르고 켜기).
 * 이미 켰거나, 알림을 막았거나, '나중에'를 누르면(7일) 안 보입니다.
 */
export function UrgentAlertPrompt() {
  const pushKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [show, setShow] = useState(false);
  const [region, setRegion] = useState<string>(ALL_REGIONS);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported(pushKey) || !isInstalledApp()) return;
    if (typeof Notification !== "undefined" && Notification.permission === "denied") return;
    if (Number(read(LATER_KEY) ?? 0) > Date.now()) return;
    let alive = true;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!alive || sub) return;
        setRegion(read(REGION_KEY) || ALL_REGIONS);
        setShow(true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [pushKey]);

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("휴대폰 설정에서 POKA 알림을 허용해 주세요.");
      const sub = await ensurePushSubscription(pushKey);
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error("알림 등록에 실패했습니다. 잠시 뒤 다시 눌러 주세요.");
      write(REGION_KEY, region);
      setDone(true);
      window.setTimeout(() => setShow(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function later() {
    write(LATER_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setShow(false);
  }

  if (!show) return null;
  return (
    <section data-urgent-prompt aria-label="급구 알림 받기" className="relative grid gap-2 rounded-[1.35rem] border border-[#c9a25c]/60 bg-[linear-gradient(135deg,#3a1414,#1d1611)] p-3.5">
      <button type="button" onClick={later} aria-label="나중에" className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full text-[#d1c7b5] hover:bg-white/10">
        <XIcon className="size-4" />
      </button>
      <p className="flex items-center gap-2 pr-8 text-base font-black text-white">
        <BellRingIcon className="size-5 shrink-0 text-[#f3d9a4]" />
        {done ? "급구 알림을 켰어요!" : "새 급구가 올라오면 바로 알려 드릴까요?"}
      </p>
      {done ? (
        <p className="text-sm text-[#d1c7b5]">{region === ALL_REGIONS ? "모든 지역" : region} 급구가 올라오면 휴대폰으로 알림이 와요.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="알림 받을 지역" value={region} onChange={(e) => setRegion(e.target.value)} className="h-11 rounded-xl border border-white/20 bg-black px-2 text-sm font-bold text-white">
            <option value={ALL_REGIONS}>전국(모든 지역)</option>
            {JOB_REGIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button type="button" disabled={busy} onClick={() => void turnOn()} className="min-h-11 flex-1 rounded-xl bg-[#c9a25c] px-4 text-sm font-black whitespace-nowrap text-[#1d1611] disabled:opacity-60">
            {busy ? "켜는 중…" : "🔔 알림 켜기"}
          </button>
          <button type="button" onClick={later} className="min-h-11 rounded-xl px-3 text-sm font-bold text-[#d1c7b5]">
            나중에
          </button>
        </div>
      )}
      {error ? <p className="text-sm font-bold text-rose-300">{error}</p> : null}
    </section>
  );
}
