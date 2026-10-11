import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { canWriteBoard } from "@/lib/permissions";
import { POSTER_MODEL_DEFAULT, normalizePosterAnswer, posterPrompt } from "@/lib/poster-analyze";
import { imageIdFromUrl } from "@/lib/uploads";

export const maxDuration = 60;

/**
 * 올린 포스터 이미지를 Claude 비전으로 읽어 대회명·장소·날짜·총상금·상세 내용을 돌려줍니다.
 * Vercel 환경변수 ANTHROPIC_API_KEY가 있어야 합니다(ANTHROPIC_MODEL로 모델 변경 가능).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  if (!canWriteBoard(user, "SCHEDULE")) {
    return NextResponse.json({ error: "POKA 공식 계정만 사용할 수 있습니다." }, { status: 403 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI 분석 키(ANTHROPIC_API_KEY)가 설정되지 않아 자동 채우기를 할 수 없습니다. 칸을 직접 채워 주세요." },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const id = imageIdFromUrl(body.url);
  if (!id) return NextResponse.json({ error: "먼저 포스터 이미지를 올려 주세요." }, { status: 400 });
  const image = await prisma.uploadedImage.findUnique({ where: { id }, select: { mime: true, data: true } });
  if (!image) return NextResponse.json({ error: "이미지를 찾을 수 없습니다." }, { status: 404 });

  // ANTHROPIC_BASE_URL은 테스트용 가짜 서버나 프록시를 쓸 때만 넣습니다.
  const base = process.env.ANTHROPIC_BASE_URL?.trim().replace(/\/$/, "") || "https://api.anthropic.com";
  const response = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL?.trim() || POSTER_MODEL_DEFAULT,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mime, data: Buffer.from(image.data).toString("base64") },
            },
            { type: "text", text: posterPrompt(todayKstDate()) },
          ],
        },
      ],
    }),
  }).catch(() => null);

  if (!response || !response.ok) {
    const detail = response ? await response.text().catch(() => "") : "";
    console.error("poster analyze failed", response?.status, detail.slice(0, 300));
    return NextResponse.json({ error: "포스터를 읽지 못했습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요." }, { status: 502 });
  }
  const payload = (await response.json()) as { content?: { type: string; text?: string }[] };
  const answer = (payload.content ?? []).map((part) => (part.type === "text" ? part.text ?? "" : "")).join("");
  const fields = normalizePosterAnswer(answer);
  if (!fields) {
    return NextResponse.json({ error: "포스터 글자를 정리하지 못했습니다. 직접 입력해 주세요." }, { status: 502 });
  }
  return NextResponse.json({ fields });
}
