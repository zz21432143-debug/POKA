import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { clearSiteSettingsCache, parseAdsOff, parseAdsSlots } from "@/lib/site-settings";
import { slotDigits } from "@/lib/adsense";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
const PLACEMENT_RE = /^[a-z0-9-]{2,24}$/;

/**
 * 광고 구좌(마스터)
 * - 켜기 · 끄기: { placement, on } → { off: [...] }
 * - 단위 ID 넣기: { placement, slot: "1234567890" 또는 광고 코드 통째로 · "" = 지움 } → { slots }
 *   placement "default" = 빈 자리 모두에 쓰는 ID
 */
export async function POST(request: Request) {
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer?.isMaster) return NextResponse.json({ error: "마스터만 할 수 있어요." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { placement?: unknown; on?: unknown; slot?: unknown };
  const placement = typeof body.placement === "string" ? body.placement : "";
  if (!PLACEMENT_RE.test(placement) && placement !== "default") return NextResponse.json({ error: "구좌를 골라 주세요." }, { status: 400 });
  if (typeof body.slot === "string") {
    const id = slotDigits(body.slot);
    if (body.slot.trim() && !id) return NextResponse.json({ error: "광고 단위 ID(숫자 10자리 안팎)를 찾지 못했어요. 애드센스 광고 코드의 data-ad-slot 숫자를 넣어 주세요." }, { status: 400 });
    const row = await prisma.siteSetting.findUnique({ where: { id: "default" }, select: { adsSlotsJson: true } });
    const slots = parseAdsSlots(row?.adsSlotsJson);
    if (id) slots[placement] = id;
    else delete slots[placement];
    const json = JSON.stringify(slots);
    await prisma.siteSetting.upsert({ where: { id: "default" }, create: { id: "default", adsSlotsJson: json }, update: { adsSlotsJson: json } });
    clearSiteSettingsCache();
    revalidateTag("site-settings", "max");
    return NextResponse.json({ slots });
  }
  const row = await prisma.siteSetting.findUnique({ where: { id: "default" }, select: { adsOffJson: true } });
  const off = new Set(parseAdsOff(row?.adsOffJson));
  if (body.on === false) off.add(placement);
  else off.delete(placement);
  const json = JSON.stringify([...off]);
  await prisma.siteSetting.upsert({ where: { id: "default" }, create: { id: "default", adsOffJson: json }, update: { adsOffJson: json } });
  clearSiteSettingsCache();
  revalidateTag("site-settings", "max");
  return NextResponse.json({ off: [...off] });
}
