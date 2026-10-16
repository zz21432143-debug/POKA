import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { clearAvailability, cleanAvailability, readAvailability, saveAvailability } from "@/lib/job-board";

export const dynamic = "force-dynamic";

/** 딜러 「가능한 날」: 내 등록 보기 · 저장 · 지우기(로그인 회원) */
export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  return NextResponse.json({ availability: await readAvailability(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  const a = cleanAvailability(await request.json().catch(() => ({})));
  if (!a.region) return NextResponse.json({ error: "지역을 골라 주세요." }, { status: 400 });
  if (!a.dates.length && !a.anyDate) return NextResponse.json({ error: "가능한 날을 하나 이상 고르거나 「날짜 상관없이 알림」을 켜 주세요." }, { status: 400 });
  await saveAvailability(user.id, a);
  return NextResponse.json({ ok: true, availability: a });
}

export async function DELETE() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  await clearAvailability(user.id);
  return NextResponse.json({ ok: true });
}
