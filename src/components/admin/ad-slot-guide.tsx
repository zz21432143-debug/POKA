import { AD_SLOTS } from "@/lib/ad-slots";
import { AdSlotMap, AdSlotTag } from "@/components/ads/ad-slot-map";

/** 배너 관리 맨 위: 홍보 자리가 화면 어디에 나오는지 그림과 함께 설명 */
export function AdSlotGuide() {
  return (
    <section aria-label="홍보 자리 안내" className="grid items-start gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
      <AdSlotMap />
      <ul className="grid gap-2 sm:grid-cols-2">
        {AD_SLOTS.map((slot) => (
          <li key={slot.key} className="rounded-xl border border-border p-3 text-sm">
            <p className="flex items-center gap-2 font-bold">
              <AdSlotTag k={slot.key} className="size-6 text-xs" />
              {slot.name} <span className="text-xs font-semibold text-muted-foreground">({slot.code})</span>
            </p>
            <p className="mt-1.5 leading-6">
              <b className="text-[#e7c98a]">어디에:</b> {slot.where}
            </p>
            <p className="mt-1 leading-6 text-muted-foreground">
              <b className="text-foreground">채우는 법:</b> {slot.admin}
            </p>
            <p className="mt-1.5 inline-flex rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/40">
              권장 {slot.size}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
