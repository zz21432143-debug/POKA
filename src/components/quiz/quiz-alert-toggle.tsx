"use client";

import { useEffect, useState } from "react";
import { BellRingIcon } from "lucide-react";
import { ensurePushSubscription, pushSupported } from "@/lib/push-client";

/** 매일 아침 9시 「오늘의 퀴즈」 알림 받기(이 기기) */
export function QuizAlertToggle() {
  return <PushAlertToggle api="/api/quiz/alert" label="매일 아침 9시 퀴즈 알림" onMessage="매일 아침 9시에 오늘의 퀴즈를 알려 드릴게요." data="quiz" />;
}

/** 오락실: 누가 상대를 찾을 때 알림(하루 2번까지 · 이 기기) */
export function GameAlertToggle() {
  return <PushAlertToggle api="/api/games/alert" label="상대 찾을 때 알림(하루 2번 · 밤엔 안 옴)" onMessage="누가 오목 · 윷 방을 열면 알려 드릴게요(하루 2번까지 · 밤 11시~아침 9시엔 안 보내요)." data="game" />;
}

/** 알림을 못 켜는 브라우저: 아이폰이면 「홈 화면에 추가」 단계별 안내 */
function IosPushGuide() {
  const [ios, setIos] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 기기 종류는 화면이 뜬 뒤에만 알 수 있음
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
  }, []);
  if (!ios) return <span className="text-xs text-zinc-400">이 브라우저는 알림을 지원하지 않아요. 크롬 · 삼성 인터넷에서 열어 주세요.</span>;
  return (
    <details data-ios-push-guide className="text-xs text-zinc-300">
      <summary className="cursor-pointer font-bold text-[#ffe08a]">📱 아이폰은 이렇게 하면 알림을 받을 수 있어요</summary>
      <ol className="mt-1.5 grid list-decimal gap-1 pl-5 leading-relaxed">
        <li>
          사파리 아래쪽 <b className="text-white">공유 버튼(네모에 위 화살표 ⬆️)</b>을 눌러요.
        </li>
        <li>
          메뉴를 내려서 <b className="text-white">「홈 화면에 추가」</b>를 눌러요.
        </li>
        <li>
          홈 화면에 생긴 <b className="text-white">POKA 아이콘</b>으로 다시 열어요.
        </li>
        <li>여기서 알림 켜기를 누르고 「허용」을 눌러요. (iOS 16.4 이상)</li>
      </ol>
    </details>
  );
}

/** 이 기기로 알림 받기(켜기 · 끄기) 공용: api는 GET ?endpoint · POST { subscription } · DELETE { endpoint } */
export function PushAlertToggle({ api, label, onMessage, data }: { api: string; label: string; onMessage: string; data: string }) {
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
        const res = await fetch(`${api}?endpoint=${encodeURIComponent(sub.endpoint)}`);
        return Boolean(((await res.json()) as { on?: boolean }).on);
      })
      .then((on) => alive && setState(on ? "on" : "off"))
      .catch(() => alive && setState("off"));
    return () => {
      alive = false;
    };
  }, [pushKey, api]);

  async function toggle() {
    setBusy(true);
    setMessage(null);
    try {
      if (state === "on") {
        const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
        if (sub) {
          const res = await fetch(api, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
          const data = (await res.json().catch(() => ({}))) as { keep?: boolean };
          // 급구 · 관리자 알림도 받는 기기면 브라우저 구독은 남겨 둠
          if (!data.keep) await sub.unsubscribe();
        }
        setState("off");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("브라우저(또는 앱) 알림 권한을 허용해 주세요.");
      const sub = await ensurePushSubscription(pushKey);
      const res = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "알림 등록에 실패했어요.");
      setState("on");
      setMessage(onMessage);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "알림 설정에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;
  return (
    <div data-quiz-alert={data === "quiz" ? "" : undefined} data-push-alert={data} className="ink-panel flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-sm">
      <BellRingIcon className="size-4 shrink-0 text-[#c9a25c]" aria-hidden />
      <span className="font-bold text-[#E5E7EB]">{label}</span>
      {state === "unsupported" ? (
        <IosPushGuide />
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
          {busy ? "설정 중…" : state === "on" ? "알림 켜짐 · 끄기" : "알림 받기"}
        </button>
      )}
      {message ? <p className="w-full text-xs text-[#e7c98a]">{message}</p> : null}
    </div>
  );
}
