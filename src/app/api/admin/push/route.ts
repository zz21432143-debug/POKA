import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/admin";
import { parseJobRegion } from "@/lib/job-status";
import { notifyBroadcast, notifyUser, pushEnabled } from "@/lib/push";

type Body = { action?: string; title?: string; body?: string; url?: string; region?: string };

/** 사이트 안 주소(/로 시작)만 받습니다. 비우면 홈. */
function safeUrl(value: unknown) {
  const url = typeof value === "string" ? value.trim() : "";
  return url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

/**
 * 알림 관리(마스터 전용)
 *  - { action: "test" }: 내 기기로 테스트 알림
 *  - { action: "broadcast", title, body, url, region? }: 급구 알림을 켠 기기에 공지 알림(지역 고르면 그 지역 + 전국)
 */
export async function POST(request: Request) {
  const { user, error } = await requireMaster();
  if (error || !user) return error ?? NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  if (!pushEnabled()) return NextResponse.json({ error: "알림 키가 설정되지 않았습니다." }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as Body;

  if (body.action === "test") {
    const result = await notifyUser(user.id, {
      title: "POKA 테스트 알림",
      body: "이 알림이 보이면 휴대폰 알림이 잘 오고 있어요.",
      url: "/admin/push",
    });
    if (result.total === 0) {
      return NextResponse.json({ error: "이 계정으로 알림을 켠 기기가 없습니다. 휴대폰 POKA 앱에서 로그인 후 급구 알림을 먼저 켜 주세요." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...result });
  }

  if (body.action === "broadcast") {
    const title = (body.title ?? "").trim().slice(0, 60);
    const text = (body.body ?? "").trim().slice(0, 140);
    if (title.length < 2 || text.length < 2) return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 });
    const region = body.region ? parseJobRegion(body.region) : null;
    if (body.region && !region) return NextResponse.json({ error: "지역을 확인하세요." }, { status: 400 });
    const result = await notifyBroadcast(region, { title, body: text, url: safeUrl(body.url) });
    return NextResponse.json({ ok: true, ...result });
  }

  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}
