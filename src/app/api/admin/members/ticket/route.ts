import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { clientIp } from "@/lib/request";
import { grantNicknameTickets } from "@/lib/nickname-force";

export const dynamic = "force-dynamic";

/** 닉네임 변경권 주기(마스터만): { nickname, count: 1~5 } */
export async function POST(request: Request) {
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer?.isMaster) return NextResponse.json({ error: "마스터만 할 수 있어요." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { nickname?: unknown; count?: unknown };
  const count = Number(body.count ?? 1);
  if (typeof body.nickname !== "string" || !Number.isFinite(count) || count < 1 || count > 5)
    return NextResponse.json({ error: "회원과 장수(1~5)를 골라 주세요." }, { status: 400 });
  const result = await grantNicknameTickets(body.nickname, count, viewer.id, clientIp(request));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
