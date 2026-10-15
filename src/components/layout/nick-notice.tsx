"use client";

import { useState } from "react";

/** 닉네임 강제 변경 안내(확인하면 다시 안 뜸) */
export function NickNotice({
  from,
  to,
  reason,
}: {
  from: string;
  to: string;
  reason: string;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div
      role="alert"
      data-nick-notice
      className="mx-auto mt-3 w-[calc(100%-1.5rem)] max-w-[1560px] rounded-2xl border-2 border-rose-400/70 bg-[#2a0f14] p-4 text-sm text-white shadow-lg"
    >
      <p className="text-base font-black text-rose-200">
        ⚠️ 닉네임이 변경되었어요
      </p>
      <p className="mt-1 leading-6">
        「{from}」 닉네임이 <b className="text-rose-200">{reason}</b> 관련 운영
        정책으로 <b className="text-[#ffcf4a]">「{to}」</b>로 바뀌었어요. 닉네임
        변경권 1장을 드렸으니 바른 닉네임으로 바꿔 주세요.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href="/account#nickname"
          className="inline-flex min-h-11 items-center rounded-xl bg-[#ffcf4a] px-4 font-black text-[#2a1400]"
        >
          닉네임 바꾸러 가기
        </a>
        <button
          type="button"
          data-nick-notice-ok
          onClick={() => {
            setHidden(true);
            void fetch("/api/me/nick-notice", { method: "POST" }).catch(
              () => undefined,
            );
          }}
          className="inline-flex min-h-11 items-center rounded-xl border border-white/30 px-4 font-bold"
        >
          확인
        </button>
      </div>
    </div>
  );
}
