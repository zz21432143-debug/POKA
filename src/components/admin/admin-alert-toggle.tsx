"use client";

import { useEffect, useState } from "react";
import { BellRingIcon } from "lucide-react";
import { ensurePushSubscription, pushSupported } from "@/lib/push-client";

/** 이 기기(휴대폰·PC)로 새 광고·홍보 문의 알림 받기 */
export function AdminAlertToggle() {
  const pushKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [state, setState] = useState<"loading" | "unsupported" | "on" | "off">("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported(pushKey)) {
      // 지원 여부는 브라우저에서만 알 수 있어 마운트 후에 반영합니다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("unsupported");
      return;
    }
    let alive = true;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (!sub) return false;
        const response = await fetch(`/api/push/admin?endpoint=${encodeURIComponent(sub.endpoint)}`);
        const data = (await response.json()) as { on?: boolean };
        return Boolean(data.on);
      })
      .then((on) => {
        if (alive) setState(on ? "on" : "off");
      })
      .catch(() => {
        if (alive) setState("off");
      });
    return () => {
      alive = false;
    };
  }, [pushKey]);

  async function toggle() {
    setBusy(true);
    setMessage(null);
    try {
      if (state === "on") {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const response = await fetch("/api/push/admin", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          const data = (await response.json().catch(() => ({}))) as { keep?: boolean };
          // 급구 알림도 이 기기로 받고 있으면 브라우저 구독은 남겨 둡니다.
          if (!data.keep) await sub.unsubscribe();
        }
        setState("off");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("브라우저(또는 앱) 알림 권한을 허용해 주세요.");
      const sub = await ensurePushSubscription(pushKey);
      const response = await fetch("/api/push/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "알림 등록에 실패했습니다.");
      setState("on");
      setMessage("이제 새 문의가 들어오면 이 기기로 알림이 옵니다.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "알림 설정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  return (
    <div className="ink-panel mt-2 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5 text-sm">
      <BellRingIcon className="size-4 shrink-0 text-[#C59B27]" aria-hidden />
      <span className="font-semibold text-[#E5E7EB]">새 문의 알림</span>
      {state === "unsupported" ? (
        <span className="text-xs text-[#9CA3AF]">
          이 브라우저는 알림을 지원하지 않습니다. 아이폰은 POKA 앱(홈 화면에 추가)으로 열어 주세요.
        </span>
      ) : (
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy}
          className={
            state === "on"
              ? "touch-target ml-auto inline-flex min-h-10 items-center rounded-full border border-emerald-600 px-3 text-xs font-bold text-emerald-300"
              : "touch-target ml-auto inline-flex min-h-10 items-center rounded-full bg-[#8b2222] px-3 text-xs font-bold text-white hover:bg-[#a12a2a]"
          }
        >
          {busy ? "설정 중…" : state === "on" ? "이 기기 알림 켜짐 · 끄기" : "이 기기로 알림 받기"}
        </button>
      )}
      {message ? <p className="w-full text-xs text-[#e7c98a]">{message}</p> : null}
    </div>
  );
}
