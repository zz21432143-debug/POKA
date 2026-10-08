import { NextResponse } from "next/server";
import { clearSession, getCurrentUser } from "@/lib/current-user";
import { WithdrawError, withdrawAccount } from "@/lib/account-delete";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  }
  return NextResponse.json({
    nickname: user.nickname,
    email: user.email,
    level: user.level,
  });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if ((body.confirm ?? "").trim() !== user.nickname) {
    return NextResponse.json({ error: "탈퇴하려면 현재 닉네임을 그대로 입력하세요." }, { status: 400 });
  }
  try {
    await withdrawAccount(user.id);
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WithdrawError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "탈퇴에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
