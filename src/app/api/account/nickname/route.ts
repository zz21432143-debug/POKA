import { NextResponse } from "next/server";
import { getCurrentUser, setSessionNickname } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { nicknameChangeBlocked } from "@/lib/nickname-change";
import { nicknameError, normalizeNickname } from "@/lib/nickname";
import { nicknameAvailability } from "@/lib/nickname-lookup";
import { AccountRestrictedError, assertAccountActive } from "@/lib/account-restriction";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const url = new URL(request.url);
    const nickname = url.searchParams.get("nickname") ?? "";
    const availability = await nicknameAvailability(nickname, user.id);
    return NextResponse.json(availability);
  } catch (error) {
    const message = error instanceof Error ? error.message : "확인할 수 없습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    await assertAccountActive(user);
    const body = (await request.json().catch(() => ({}))) as { nickname?: string };
    const next = normalizeNickname(body.nickname ?? "");
    const invalid = nicknameError(next);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    if (next === user.nickname) {
      return NextResponse.json({ error: "지금과 같은 닉네임입니다." }, { status: 400 });
    }

    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { nicknameChangeCount: true, nicknameTickets: true },
    });
    const changeCount = row?.nicknameChangeCount ?? 0;
    const tickets = row?.nicknameTickets ?? 0;
    const blocked = nicknameChangeBlocked(changeCount, tickets);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 400 });

    const availability = await nicknameAvailability(next, user.id);
    if (!availability.ok) {
      return NextResponse.json({ error: availability.error }, { status: availability.error.includes("이미") ? 409 : 400 });
    }

    const usedFree = changeCount <= 0;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        nickname: next,
        nicknameChangeCount: { increment: 1 },
        ...(usedFree ? {} : { nicknameTickets: { decrement: 1 } }),
      },
    });
    await setSessionNickname(next);
    return NextResponse.json({ ok: true, nickname: next, usedFree });
  } catch (error) {
    if (error instanceof AccountRestrictedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "닉네임을 바꾸지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
