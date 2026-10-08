import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { clientIp } from "@/lib/request";
import { CoolDownError, assertWriteCooldown } from "@/lib/security";
import { AccountRestrictedError, assertAccountActive } from "@/lib/account-restriction";
import { createContentReport } from "@/lib/reports";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    await assertAccountActive(user);
    const { id } = await context.params;
    const body = (await request.json()) as { reason?: string };
    const ip = clientIp(request);
    await assertWriteCooldown({
      kind: "report",
      userId: user.id,
      ip,
      isAdmin: user.isAdmin,
    });
    await createContentReport({
      reporterId: user.id,
      targetType: "comment",
      targetId: id,
      reason: body.reason ?? "",
      ip,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountRestrictedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CoolDownError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
      );
    }
    const message = error instanceof Error ? error.message : "신고에 실패했습니다.";
    const status = message.includes("이미 신고") ? 409 : message.includes("찾을 수") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
