import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { addSuggestion, parseQuizInput } from "@/lib/quiz-suggest";

export const dynamic = "force-dynamic";

/** 회원 문제 제안(운영자가 골라서 냄 · 채택되면 포인트) */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인하면 문제를 낼 수 있어요." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseQuizInput(body);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const saved = await addSuggestion(user.id, parsed.value);
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 429 });
  return NextResponse.json({ ok: true });
}
