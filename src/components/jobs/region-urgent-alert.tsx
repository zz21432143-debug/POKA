"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRingIcon } from "lucide-react";
import { ALL_REGIONS, JOB_REGIONS } from "@/lib/job-status";
import { ensurePushSubscription, pushSupported } from "@/lib/push-client";

const REGION_KEY = "poka-alert-region";
const SEEN_KEY = "poka-alert-urgent-seen";

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // 저장소를 못 쓰는 브라우저는 이번 방문 동안만 기억합니다.
  }
}

/**
 * 내 지역 급구 알림. 지역을 정해 두면 마지막 확인 이후 새로 올라온 급구 수를 보여줍니다.
 * 지역과 확인 시각은 이 브라우저에만 저장합니다.
 */
export function RegionUrgentAlert() {
  const [region, setRegion] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 저장된 지역은 브라우저에서만 읽을 수 있어 마운트 후에 반영합니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRegion(read(REGION_KEY));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!region) return;
    const since = read(SEEN_KEY) ?? "0";
    let alive = true;
    fetch(`/api/jobs/urgent-count?region=${encodeURIComponent(region)}&since=${since}`)
      .then((response) => response.json() as Promise<{ count?: number }>)
      .then((payload) => {
        if (alive) setCount(payload.count ?? 0);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [region]);

  function choose(value: string) {
    const next = value || null;
    write(REGION_KEY, next);
    if (next) write(SEEN_KEY, String(oneDayAgo()));
    setCount(0);
    setRegion(next);
    // 휴대폰 알림을 켜 둔 상태면 받는 지역도 함께 바꿉니다.
    if (next && pushOn) void subscribePush(next).catch(() => undefined);
  }

  const pushKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [canPush, setCanPush] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported(pushKey)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanPush(true);
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushOn(Boolean(sub)))
      .catch(() => undefined);
  }, [pushKey]);

  async function subscribePush(targetRegion: string) {
    const sub = await ensurePushSubscription(pushKey);
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region: targetRegion, subscription: sub.toJSON() }),
    });
    if (!response.ok) throw new Error("알림 등록에 실패했습니다.");
  }

  async function togglePush() {
    if (!region) return;
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushOn) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const response = await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          const data = (await response.json().catch(() => ({}))) as { keep?: boolean };
          // 관리자 알림도 이 기기로 받고 있으면 브라우저 구독은 남겨 둡니다.
          if (!data.keep) await sub.unsubscribe();
        }
        setPushOn(false);
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("브라우저 알림 권한을 허용해 주세요.");
      await subscribePush(region);
      setPushOn(true);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "알림 설정에 실패했습니다.");
    } finally {
      setPushBusy(false);
    }
  }

  function markSeen() {
    write(SEEN_KEY, String(Date.now()));
    setCount(0);
  }

  if (!ready) return null;

  return (
    <section className="ink-panel flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5 text-sm">
      <BellRingIcon className="size-4 shrink-0 text-[#C59B27]" aria-hidden />
      <label htmlFor="alert-region" className="font-semibold text-[#E5E7EB]">
        내 지역 급구 알림
      </label>
      <select
        id="alert-region"
        className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-[#E5E7EB]"
        value={region ?? ""}
        onChange={(event) => choose(event.target.value)}
      >
        <option value="">지역 선택</option>
        <option value={ALL_REGIONS}>전국(모든 지역)</option>
        {JOB_REGIONS.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {region ? (
        <Link
          href={region === ALL_REGIONS ? "/boards/jobs/urgent?open=1" : `/boards/jobs/urgent?region=${encodeURIComponent(region)}&open=1`}
          onClick={markSeen}
          className="touch-target ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 font-semibold text-[#f3eadb] hover:bg-white/10"
        >
          {count > 0 ? (
            <>
              <span className="rounded-full bg-[#8B2222] px-2 py-0.5 text-xs font-bold text-white">{count}</span>
              {region} 새 급구
            </>
          ) : (
            <span className="text-[#9CA3AF]">{region} 새 급구 없음</span>
          )}
        </Link>
      ) : (
        <span className="text-xs text-[#9CA3AF]">지역을 고르면 새 급구가 올라올 때 여기 표시됩니다.</span>
      )}
      {region && canPush ? (
        <button
          type="button"
          onClick={() => void togglePush()}
          disabled={pushBusy}
          className={
            pushOn
              ? "touch-target inline-flex min-h-9 items-center rounded-full border border-emerald-600 px-3 text-xs font-bold text-emerald-300"
              : "touch-target inline-flex min-h-9 items-center rounded-full bg-[#8b2222] px-3 text-xs font-bold text-white hover:bg-[#a12a2a]"
          }
        >
          {pushBusy ? "설정 중…" : pushOn ? `${region} 휴대폰 알림 켜짐 · 끄기` : "휴대폰 알림 켜기"}
        </button>
      ) : null}
      {pushError ? <p className="w-full text-xs text-destructive">{pushError}</p> : null}
    </section>
  );
}

/** 지역을 처음 고르면 최근 하루치 급구부터 새 글로 셉니다. */
function oneDayAgo() {
  return Date.now() - 24 * 60 * 60 * 1000;
}
