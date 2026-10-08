import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { NICKNAME_TICKET_NAME, NICKNAME_TICKET_PRICE } from "@/lib/nickname-change";
import { AccountRestrictedError, assertAccountActive } from "@/lib/account-restriction";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    await assertAccountActive(user);
    const fresh = await prisma.user.findUnique({
      where: { id: user.id },
      select: { points: true, nicknameTickets: true },
    });
    if (!fresh) return NextResponse.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
    if (fresh.points < NICKNAME_TICKET_PRICE) {
      return NextResponse.json({ error: "포인트가 부족합니다." }, { status: 400 });
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        points: { decrement: NICKNAME_TICKET_PRICE },
        nicknameTickets: { increment: 1 },
      },
      select: { points: true, nicknameTickets: true },
    });
    return NextResponse.json({
      ok: true,
      name: NICKNAME_TICKET_NAME,
      points: updated.points,
      tickets: updated.nicknameTickets,
    });
  } catch (error) {
    if (error instanceof AccountRestrictedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "구매에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
