import Link from "@/components/ui/link";
import { nowMs } from "@/lib/dates";
import { lowFillPlacements } from "@/lib/ad-fill";

/** 관리 화면 맨 위: 광고가 잘 안 채워지는 자리 알림(마스터) */
export async function AdFillAlert() {
  const low = await lowFillPlacements(nowMs());
  if (!low.length) return null;
  return (
    <Link href="/admin/adsense" data-ad-fill-alert className="block rounded-2xl border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm">
      <b className="text-amber-200">⚠️ 광고가 잘 안 채워지는 자리 {low.length}곳</b>
      <span className="block text-xs text-amber-100/90">
        {low.map((r) => `${r.label} ${r.rate}%`).join(" · ")} — 최근 7일 기준. 그 자리만 다른 광고 단위로 바꾸거나 꺼 보세요 →
      </span>
    </Link>
  );
}
