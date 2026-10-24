"use client";

/** 인쇄 · PDF 저장(브라우저 인쇄 창) */
export function PrintButton() {
  return (
    <button
      type="button"
      data-no-print
      data-print
      onClick={() => window.print()}
      className="min-h-11 rounded-xl bg-[#c9a25c] px-4 text-sm font-black text-[#1d1611] hover:bg-[#e7c98a]"
    >
      🖨 인쇄 · PDF 저장
    </button>
  );
}
