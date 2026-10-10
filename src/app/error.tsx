"use client";

export default function PageError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-[#1a1617] px-6 py-16 text-center">
      <p className="text-lg font-semibold">페이지를 불러오지 못했습니다.</p>
      <p className="text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-2 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white"
      >
        다시 시도
      </button>
    </div>
  );
}
