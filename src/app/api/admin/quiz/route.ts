import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { shiftDate } from "@/lib/dates";
import { QUIZ_SLOT_RE, quizSlotAt, quizSlotDate } from "@/lib/quiz";
import { decideSuggestion, listSuggestions, parseQuizInput } from "@/lib/quiz-suggest";

export const dynamic = "force-dynamic";

/** 칸 키: 날짜(아침 9시) · 날짜-2(저녁 9시) */
const validDay = (v: unknown): v is string => typeof v === "string" && QUIZ_SLOT_RE.test(v);

/** 최근 14일 + 앞으로 잡아 둔 문제(답한 사람 수 포함) */
async function list() {
  const from = shiftDate(quizSlotDate(quizSlotAt()), -14);
  const rows = await prisma.dailyQuiz.findMany({ where: { day: { gte: from } }, orderBy: { day: "desc" }, take: 60 });
  const counts = rows.length ? await prisma.quizAnswer.groupBy({ by: ["quizId"], where: { quizId: { in: rows.map((r) => r.id) } }, _count: { _all: true } }) : [];
  const countOf = new Map(counts.map((c) => [c.quizId, c._count._all]));
  return rows.map((r) => ({ id: r.id, day: r.day, kind: r.kind, question: r.question, choices: JSON.parse(r.choicesJson) as string[], answer: r.answer, explanation: r.explanation, source: r.source, answers: countOf.get(r.id) ?? 0 }));
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const [rows, suggestions] = await Promise.all([list(), listSuggestions()]);
  return NextResponse.json({ today: quizSlotAt(), rows, suggestions });
}

/** 회원 제안 채택(+포인트) · 거절 */
export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { id?: unknown; action?: unknown };
  if (typeof body.id !== "string" || (body.action !== "adopt" && body.action !== "reject")) return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  const ok = await decideSuggestion(body.id, body.action);
  if (!ok) return NextResponse.json({ error: "이미 처리된 제안이에요." }, { status: 409 });
  return NextResponse.json({ ok: true, suggestions: await listSuggestions() });
}

/** 그날 문제를 직접 넣기(이미 누가 답했으면 못 바꿈) */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const day = body.day;
  if (!validDay(day)) return NextResponse.json({ error: "날짜를 확인해 주세요." }, { status: 400 });
  if (day < quizSlotAt()) return NextResponse.json({ error: "지난 문제는 바꿀 수 없어요." }, { status: 400 });
  const parsed = parseQuizInput(body);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { question, choices, answer, explanation } = parsed.value;
  const existing = await prisma.dailyQuiz.findUnique({ where: { day } });
  if (existing) {
    const answered = await prisma.quizAnswer.count({ where: { quizId: existing.id } });
    if (answered > 0) return NextResponse.json({ error: `이미 ${answered}명이 답한 문제라 바꿀 수 없어요.` }, { status: 409 });
  }
  // 채택한 회원 제안에서 온 문제면 출제자 표시(source = member:회원id)
  let source = "admin";
  if (typeof body.fromSuggestion === "string") {
    const sugg = await prisma.toolSaved.findFirst({ where: { id: body.fromSuggestion, kind: "quiz-suggest", name: "adopted" }, select: { ownerId: true } });
    if (sugg) source = `member:${sugg.ownerId}`;
  }
  // 회원 문제를 고치기만 하면 출제자 표시는 그대로
  if (source === "admin" && existing?.source.startsWith("member:")) source = existing.source;
  const data = { kind: "custom", question, choicesJson: JSON.stringify(choices), answer, explanation, source };
  await prisma.dailyQuiz.upsert({ where: { day }, create: { day, ...data }, update: data });
  return NextResponse.json({ ok: true, rows: await list() });
}

/** 직접 넣은 문제 지우기(답한 사람이 없을 때만 · 그날 열면 자동 문제가 다시 생김) */
export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const day = new URL(request.url).searchParams.get("day");
  if (!validDay(day)) return NextResponse.json({ error: "날짜를 확인해 주세요." }, { status: 400 });
  const existing = await prisma.dailyQuiz.findUnique({ where: { day } });
  if (!existing) return NextResponse.json({ ok: true, rows: await list() });
  const answered = await prisma.quizAnswer.count({ where: { quizId: existing.id } });
  if (answered > 0) return NextResponse.json({ error: `이미 ${answered}명이 답한 문제라 지울 수 없어요.` }, { status: 409 });
  await prisma.dailyQuiz.delete({ where: { day } });
  return NextResponse.json({ ok: true, rows: await list() });
}
