import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { autoPublishable, loadPublishItems } from "@/lib/content-publish";
import { autoPublishOn, kstNow } from "@/lib/content-auto";
import { makeSessionToken } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/current-user";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * 콘텐츠 자동 발행(KST 12:05 · 21:05, vercel.json crons): 오늘 요일 계획 글 중 시간이 된 것 하나를 POKA 계정으로.
 * 일반 글쓰기(/api/posts)를 그대로 써서 금지어 · 보상 · 전광판 · 검색 알림이 똑같이 적용됨.
 * 사진 · 직접 그리는 핸드 · 〔 〕 · 빈 본문 · 빼기 · 이미 올린 글은 건너뜀(관리 화면에 그대로 남음).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await autoPublishOn())) return NextResponse.json({ ok: true, skipped: "off" });
  const poka = await prisma.user.findFirst({ where: { isMaster: true, nickname: "POKA" }, select: { id: true, sessionVersion: true } });
  if (!poka) return NextResponse.json({ ok: false, error: "no POKA account" });
  const { day, time } = kstNow();
  const items = await loadPublishItems(poka);
  const next = items.find((item) => item.day === day && item.time <= time && autoPublishable(item));
  if (!next) return NextResponse.json({ ok: true, skipped: "nothing", day, time });
  const base = siteUrl();
  const res = await fetch(`${base}/api/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: base,
      cookie: `${SESSION_COOKIE}=${makeSessionToken(poka.id, poka.sessionVersion)}`,
    },
    body: JSON.stringify({ boardType: next.boardType, title: next.title, content: next.content, ...(next.hand ? { handReview: next.hand } : {}) }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  return NextResponse.json({ ok: res.ok, id: json.id ?? null, error: json.error ?? null, title: next.title }, { status: res.ok ? 200 : 500 });
}
