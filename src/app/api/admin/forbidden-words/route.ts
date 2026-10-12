import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { clearForbiddenWordsCache } from "@/lib/forbidden-words";
import { BASE_WORDS } from "@/lib/profanity";

const ALL_BASE_WORDS = new Set(Object.values(BASE_WORDS).flat());

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const words = await prisma.forbiddenWord.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ words });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { word?: string };
  const word = body.word?.trim() ?? "";
  if (word.length < 2) {
    return NextResponse.json({ error: "금지어는 두 글자 이상이어야 합니다." }, { status: 400 });
  }
  try {
    const row = await prisma.forbiddenWord.create({ data: { word } });
    clearForbiddenWordsCache();
    return NextResponse.json({ ok: true, word: row });
  } catch {
    return NextResponse.json({ error: "이미 등록된 단어입니다." }, { status: 409 });
  }
}

/** 기본 금지어 끄기·켜기: { word, enabled } */
export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { word?: string; enabled?: boolean };
  const word = body.word ?? "";
  if (!ALL_BASE_WORDS.has(word) || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "기본 금지어가 아닙니다." }, { status: 400 });
  }
  if (body.enabled) {
    await prisma.disabledBaseWord.deleteMany({ where: { word } });
  } else {
    await prisma.disabledBaseWord.upsert({ where: { word }, create: { word }, update: {} });
  }
  clearForbiddenWordsCache();
  return NextResponse.json({ ok: true, word, enabled: body.enabled });
}

export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }
  await prisma.forbiddenWord.delete({ where: { id } }).catch(() => undefined);
  clearForbiddenWordsCache();
  return NextResponse.json({ ok: true });
}
