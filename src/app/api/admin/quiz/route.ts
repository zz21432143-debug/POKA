import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { shiftDate, todayKstDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const validDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** 최근 14일 + 앞으로 잡아 둔 문제(답한 사람 수 포함) */
async function list() {
  const from = shiftDate(todayKstDate(), -14);
  const rows = await prisma.dailyQuiz.findMany({ where: { day: { gte: from } }, orderBy: { day: "desc" }, take: 60 });
  const counts = rows.length ? await prisma.quizAnswer.groupBy({ by: ["quizId"], where: { quizId: { in: rows.map((r) => r.id) } }, _count: { _all: true } }) : [];
  const countOf = new Map(counts.map((c) => [c.quizId, c._count._all]));
  return rows.map((r) => ({ id: r.id, day: r.day, kind: r.kind, question: r.question, choices: JSON.parse(r.choicesJson) as string[], answer: r.answer, explanation: r.explanation, source: r.source, answers: countOf.get(r.id) ?? 0 }));
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json({ today: todayKstDate(), rows: await list() });
}

/** 그날 문제를 직접 넣기(이미 누가 답했으면 못 바꿈) */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const day = body.day;
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 200) : "";
  const explanation = typeof body.explanation === "string" ? body.explanation.trim().slice(0, 600) : "";
  const choices = Array.isArray(body.choices) ? body.choices.map((c) => (typeof c === "string" ? c.trim().slice(0, 60) : "")).filter(Boolean) : [];
  const answer = Number(body.answer);
  if (!validDay(day)) return NextResponse.json({ error: "날짜를 확인해 주세요." }, { status: 400 });
  if (day < todayKstDate()) return NextResponse.json({ error: "지난 날짜 문제는 바꿀 수 없어요." }, { status: 400 });
  if (!question) return NextResponse.json({ error: "문제를 적어 주세요." }, { status: 400 });
  if (choices.length < 2 || choices.length > 4 || new Set(choices).size !== choices.length) return NextResponse.json({ error: "보기는 서로 다른 2~4개로 적어 주세요." }, { status: 400 });
  if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) return NextResponse.json({ error: "정답 보기를 골라 주세요." }, { status: 400 });
  if (!explanation) return NextResponse.json({ error: "해설을 적어 주세요." }, { status: 400 });
  const existing = await prisma.dailyQuiz.findUnique({ where: { day } });
  if (existing) {
    const answered = await prisma.quizAnswer.count({ where: { quizId: existing.id } });
    if (answered > 0) return NextResponse.json({ error: `이미 ${answered}명이 답한 문제라 바꿀 수 없어요.` }, { status: 409 });
  }
  const data = { kind: "custom", question, choicesJson: JSON.stringify(choices), answer, explanation, source: "admin" };
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
