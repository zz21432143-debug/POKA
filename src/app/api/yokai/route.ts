import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { applyBackground, buyBackground, buySnack, chooseStarter, feedYokai, getYokai, markSeen, petYokai, setYokai, showerYokai, yokaiPublic } from "@/lib/yokai-server";
import { isBackground, isSpecies } from "@/lib/yokai";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/** 로그인 회원(요괴 마을을 닫아 두면 마스터만 · 그 밖엔 없는 주소처럼 404) */
async function master() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return null;
  return yokaiPublic() || user.isMaster ? user : null;
}

export async function GET() {
  const user = await master();
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ yokai: await getYokai(user.id) }, { headers: NO_STORE });
}

/** { action: "choose" | "active" | "main", species } · { action: "feed" | "pet" | "seen" } */
export async function POST(request: Request) {
  const user = await master();
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; species?: unknown };
  let result: { ok: boolean; error?: string; evolved?: number | null };
  if (body.action === "choose" || body.action === "active" || body.action === "main") {
    if (!isSpecies(body.species)) return NextResponse.json({ error: "요괴를 골라 주세요." }, { status: 400 });
    result = body.action === "choose" ? await chooseStarter(user.id, body.species) : await setYokai(user.id, body.action, body.species);
  } else if (body.action === "feed") result = await feedYokai(user.id);
  else if (body.action === "pet") result = await petYokai(user.id);
  else if (body.action === "seen") result = await markSeen(user.id);
  else if (body.action === "snack") result = await buySnack(user.id);
  else if (body.action === "shower") result = await showerYokai(user.id);
  else if (body.action === "buyBg" || body.action === "useBg") {
    const bg = (body as { bg?: unknown }).bg;
    if (!isBackground(bg)) return NextResponse.json({ error: "배경을 골라 주세요." }, { status: 400 });
    result = body.action === "buyBg" ? await buyBackground(user.id, bg) : await applyBackground(user.id, bg);
  }
  else return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  if (!result.ok) return NextResponse.json({ error: result.error, yokai: await getYokai(user.id) }, { status: 409, headers: NO_STORE });
  return NextResponse.json({ ok: true, evolved: result.evolved ?? null, yokai: await getYokai(user.id) }, { headers: NO_STORE });
}
