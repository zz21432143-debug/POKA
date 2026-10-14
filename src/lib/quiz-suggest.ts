import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";

/** 회원이 낸 문제가 채택되면 주는 포인트 · 하루에 낼 수 있는 수 */
export const SUGGEST_POINTS = 50;
export const SUGGEST_PER_DAY = 3;
const KIND = "quiz-suggest";

export type QuizInput = { question: string; choices: string[]; answer: number; explanation: string };
export type Suggestion = QuizInput & { id: string; userId: string; nickname: string; status: "pending" | "adopted" | "rejected"; createdAt: string };

/** 문제 · 보기 · 정답 · 해설 확인(관리자 출제 · 회원 제안 공용). 문제가 있으면 error */
export function parseQuizInput(body: Record<string, unknown>): { value: QuizInput; error: null } | { value: null; error: string } {
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 200) : "";
  const explanation = typeof body.explanation === "string" ? body.explanation.trim().slice(0, 600) : "";
  const choices = Array.isArray(body.choices) ? body.choices.map((c) => (typeof c === "string" ? c.trim().slice(0, 60) : "")).filter(Boolean) : [];
  const answer = Number(body.answer);
  if (!question) return { value: null, error: "문제를 적어 주세요." };
  if (choices.length < 2 || choices.length > 4 || new Set(choices).size !== choices.length) return { value: null, error: "보기는 서로 다른 2~4개로 적어 주세요." };
  if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) return { value: null, error: "정답 보기를 골라 주세요." };
  if (!explanation) return { value: null, error: "해설을 적어 주세요." };
  return { value: { question, choices, answer, explanation }, error: null };
}

/** 회원 문제 제안 저장(하루 SUGGEST_PER_DAY개까지) */
export async function addSuggestion(userId: string, input: QuizInput) {
  const since = new Date(Date.parse(`${todayKstDate()}T00:00:00+09:00`));
  const today = await prisma.toolSaved.count({ where: { ownerId: userId, kind: KIND, createdAt: { gte: since } } });
  if (today >= SUGGEST_PER_DAY) return { ok: false as const, error: `문제 제안은 하루 ${SUGGEST_PER_DAY}개까지예요.` };
  await prisma.toolSaved.create({ data: { ownerId: userId, kind: KIND, name: "pending", dataJson: JSON.stringify(input) } });
  return { ok: true as const };
}

/** 관리자: 기다리는 제안(오래된 것부터) */
export async function listSuggestions(take = 50): Promise<Suggestion[]> {
  const rows = await prisma.toolSaved.findMany({ where: { kind: KIND, name: "pending" }, orderBy: { createdAt: "asc" }, take }).catch(() => []);
  const users = rows.length ? await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.ownerId) } }, select: { id: true, nickname: true } }) : [];
  const nick = new Map(users.map((u) => [u.id, u.nickname]));
  return rows.flatMap((r) => {
    try {
      return [{ ...(JSON.parse(r.dataJson) as QuizInput), id: r.id, userId: r.ownerId, nickname: nick.get(r.ownerId) ?? "(탈퇴)", status: "pending" as const, createdAt: r.createdAt.toISOString() }];
    } catch {
      return [];
    }
  });
}

/** 채택(포인트 지급) · 거절. 이미 처리된 제안이면 false */
export async function decideSuggestion(id: string, action: "adopt" | "reject") {
  const done = await prisma.toolSaved.updateMany({ where: { id, kind: KIND, name: "pending" }, data: { name: action === "adopt" ? "adopted" : "rejected" } });
  if (done.count !== 1) return false;
  if (action === "adopt") {
    const row = await prisma.toolSaved.findUnique({ where: { id }, select: { ownerId: true } });
    if (row) {
      await prisma.user.update({ where: { id: row.ownerId }, data: { points: { increment: SUGGEST_POINTS } } }).catch(() => undefined);
      const { recordPointGain } = await import("@/lib/point-ledger");
      await recordPointGain(row.ownerId, SUGGEST_POINTS, "quiz-suggest").catch(() => undefined);
    }
  }
  return true;
}
