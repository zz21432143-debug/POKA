import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { chooseStarter, feedYokai, getYokai, petYokai } from "@/lib/yokai-server";
import { isSpecies } from "@/lib/yokai";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/** 요괴 마을은 개발 중이라 마스터 계정만(다른 사람에겐 없는 주소처럼 404) */
async function master() {
  const user = await getCurrentUser().catch(() => null);
  return user?.isMaster ? user : null;
}

export async function GET() {
  const user = await master();
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ yokai: await getYokai(user.id) }, { headers: NO_STORE });
}

/** { action: "choose", species } · { action: "feed" } · { action: "pet" } */
export async function POST(request: Request) {
  const user = await master();
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; species?: unknown };
  let result: { ok: boolean; error?: string; evolved?: number | null };
  if (body.action === "choose") {
    if (!isSpecies(body.species)) return NextResponse.json({ error: "요괴를 골라 주세요." }, { status: 400 });
    result = await chooseStarter(user.id, body.species);
  } else if (body.action === "feed") result = await feedYokai(user.id);
  else if (body.action === "pet") result = await petYokai(user.id);
  else return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true, evolved: result.evolved ?? null, yokai: await getYokai(user.id) }, { headers: NO_STORE });
}
