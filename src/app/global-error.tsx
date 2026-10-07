"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ko">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#07150f] px-6 text-center text-white">
        <p className="text-lg font-semibold">POKA를 불러오지 못했습니다.</p>
        <p className="text-sm text-white/70">서버가 잠시 멈췄습니다. 다시 열어 주세요.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-2 inline-flex min-h-11 items-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white"
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
