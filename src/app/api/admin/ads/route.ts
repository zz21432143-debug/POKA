import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { clearSiteSettingsCache, parseAdsOff } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
const PLACEMENT_RE = /^[a-z0-9-]{2,24}$/;

/** 광고 구좌 켜기 · 끄기(마스터): { placement, on } → { off: [...] } */
export async function POST(request: Request) {
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer?.isMaster) return NextResponse.json({ error: "마스터만 할 수 있어요." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { placement?: unknown; on?: unknown };
  const placement = typeof body.placement === "string" ? body.placement : "";
  if (!PLACEMENT_RE.test(placement)) return NextResponse.json({ error: "구좌를 골라 주세요." }, { status: 400 });
  const row = await prisma.siteSetting.findUnique({ where: { id: "default" }, select: { adsOffJson: true } });
  const off = new Set(parseAdsOff(row?.adsOffJson));
  if (body.on === false) off.add(placement);
  else off.delete(placement);
  const json = JSON.stringify([...off]);
  await prisma.siteSetting.upsert({ where: { id: "default" }, create: { id: "default", adsOffJson: json }, update: { adsOffJson: json } });
  clearSiteSettingsCache();
  return NextResponse.json({ off: [...off] });
}
