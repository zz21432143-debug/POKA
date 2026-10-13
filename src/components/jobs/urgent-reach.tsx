"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BellRingIcon, XIcon } from "lucide-react";

/** 급구 글쓰기: "서울 급구 알림 받는 사람 N명에게 바로 알림이 가요" */
export function UrgentReach({ region }: { region: string }) {
  const [info, setInfo] = useState<{ enabled: boolean; count: number } | null>(null);
  useEffect(() => {
    if (!region) return;
    let alive = true;
    fetch(`/api/push/count?region=${encodeURIComponent(region)}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<{ enabled: boolean; count: number }>)
      .then((d) => alive && setInfo(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [region]);
  // 지역을 고르기 전에는 보여 주지 않습니다.
  if (!region || !info?.enabled) return null;
  return (
    <p data-urgent-reach className="flex items-center gap-2 rounded-xl border border-[#c9a25c]/50 bg-[#2a2017] px-3 py-2.5 text-sm font-bold text-[#f3d9a4]">
      <BellRingIcon className="size-4 shrink-0" />
      {info.count > 0 ? (
        <span>
          올리면 <b className="text-white">{region} 급구 알림</b>을 켠 <b className="text-white">{info.count.toLocaleString()}명</b>에게 바로 휴대폰 알림이 가요.
        </span>
      ) : (
        <span>올리면 {region} 급구 알림을 켠 사람에게 바로 휴대폰 알림이 가요.</span>
      )}
    </p>
  );
}

/** 급구를 올린 직후 글 위에: "급구 알림을 N명에게 보냈어요"(주소의 ?pushed=N) */
export function PushSentNotice() {
  const params = useSearchParams();
  const raw = params.get("pushed");
  const [closed, setClosed] = useState(false);
  if (raw == null || closed) return null;
  const n = Number(raw) || 0;
  return (
    <div data-push-sent className="flex items-center gap-2 rounded-xl border border-emerald-500/60 bg-emerald-950/60 px-3 py-2.5 text-sm font-bold text-emerald-100">
      <BellRingIcon className="size-4 shrink-0 text-emerald-300" />
      <span className="min-w-0 flex-1">
        {n > 0 ? (
          <>
            급구 알림을 <b className="text-white">{n.toLocaleString()}명</b>에게 보냈어요.
          </>
        ) : (
          <>급구가 올라갔어요. 아직 이 지역 알림을 켠 사람이 없어요 — 오픈채팅에 함께 공유해 보세요.</>
        )}
      </span>
      <button type="button" aria-label="닫기" onClick={() => setClosed(true)} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
