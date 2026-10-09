import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { grantLevelRewardMarks } from "@/lib/grant-reward-marks";
import { achievementBySlug } from "@/lib/yokai-achievements";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const body = (await request.json()) as { slug?: string };
    const def = achievementBySlug(body.slug ?? "");
    if (!def) {
      return NextResponse.json({ error: "보상 마크를 찾을 수 없습니다." }, { status: 404 });
    }
    if (user.level < def.minLevel) {
      return NextResponse.json({ error: "레벨 조건에 아직 도달하지 않았습니다." }, { status: 400 });
    }
    const granted = await grantLevelRewardMarks(user.id, user.level);
    return NextResponse.json({ ok: true, granted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "보상을 받지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
