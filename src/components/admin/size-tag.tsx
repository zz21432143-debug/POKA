/** 관리자 배너 화면: 권장 소재 크기 표시 */
export function SizeTag({ children }: { children: string }) {
  return (
    <span className="mt-1 inline-flex rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/40">
      권장 {children}
    </span>
  );
}
