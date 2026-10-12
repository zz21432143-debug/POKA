import { AD_SLOTS } from "@/lib/ad-slots";

export function AdSlotTag({ k, className = "" }: { k: string; className?: string }) {
  const slot = AD_SLOTS.find((row) => row.key === k);
  return (
    <span className={`grid place-items-center rounded font-black ${slot?.color ?? ""} ${className}`}>{k}</span>
  );
}

/** 홍보 자리(B·A·S·C)가 PC 화면 어디에 나오는지 보여 주는 작은 그림 */
export function AdSlotMap({ className = "" }: { className?: string }) {
  return (
    <figure className={`mx-auto grid w-full max-w-md content-start gap-1.5 ${className}`}>
      <figcaption className="text-xs font-bold text-[#9CA3AF]">PC 화면에서의 위치</figcaption>
      <div className="grid grid-cols-[1fr_3.5fr_1.6fr] content-start items-start gap-1 rounded-lg border border-white/10 bg-[#120b0b] p-1.5 text-[10px] text-[#9CA3AF]">
        <div className="col-span-3 rounded bg-white/10 px-1 py-0.5">상단 메뉴</div>
        <div className="self-stretch rounded bg-white/5 p-1">왼쪽 메뉴</div>
        <div className="grid gap-1">
          <div className="rounded bg-white/10 py-2 text-center">큰 그림</div>
          <div className="grid grid-cols-3 gap-0.5">
            {[1, 2, 3].map((n) => (
              <AdSlotTag key={n} k="B" className="aspect-[5/7] text-xs" />
            ))}
          </div>
          <div className="grid gap-0.5 rounded bg-white/5 p-1">
            <span className="h-1.5 rounded bg-white/15" />
            <span className="h-1.5 rounded bg-white/15" />
            <span className="h-1.5 rounded bg-white/15" />
            <AdSlotTag k="C" className="aspect-[3/1] text-[10px]" />
            <span className="h-1.5 rounded bg-white/15" />
            <span className="text-center">글 목록</span>
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {[1, 2, 3].map((n) => (
              <AdSlotTag key={n} k="A" className="aspect-[2/1] text-xs" />
            ))}
          </div>
        </div>
        <div className="grid content-start gap-1">
          <div className="rounded bg-white/10 py-3 text-center">내 프로필</div>
          <AdSlotTag k="S" className="aspect-[6/5] text-sm" />
          <div className="rounded bg-white/5 py-2 text-center">공지</div>
        </div>
      </div>
    </figure>
  );
}
