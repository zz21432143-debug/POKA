import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { writeAudit } from "@/lib/security";
import type { Prisma } from "@/generated/prisma/client";
import { isSanctionAction, untilFor, type SanctionAction } from "@/lib/sanctions";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const search: Prisma.UserWhereInput | undefined = q
    ? {
        OR: [
          { nickname: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { signupIp: { contains: q } },
          { posts: { some: { authorIp: { contains: q } } } },
          { comments: { some: { authorIp: { contains: q } } } },
        ],
      }
    : undefined;
  const userSelect = {
    id: true,
    nickname: true,
    email: true,
    signupIp: true,
    status: true,
    suspendedUntil: true,
    banReason: true,
    lastLoginAt: true,
    role: true,
    isAdmin: true,
    isMaster: true,
  } as const;
  const [restricted, matches] = await Promise.all([
    prisma.user.findMany({
      where: { status: { in: ["SUSPENDED", "BANNED"] } },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: userSelect,
    }),
    q
      ? prisma.user.findMany({
          where: search,
          take: 20,
          select: userSelect,
        })
      : Promise.resolve([]),
  ]);
  return NextResponse.json({ restricted, matches });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireAdmin();
  if (error || !user) return error;
  const body = (await request.json()) as {
    userId?: string;
    action?: SanctionAction;
    reason?: string;
  };
  if (!body.userId || !isSanctionAction(body.action)) {
    return NextResponse.json({ error: "대상과 제재 종류를 확인하세요." }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: body.userId } });
  if (!target) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }
  if (target.isMaster) {
    return NextResponse.json({ error: "마스터 계정은 제재할 수 없습니다." }, { status: 403 });
  }
  const reason = (body.reason ?? "").trim() || (body.action === "lift" ? null : "운영 정책 위반");
  const data =
    body.action === "lift"
      ? { status: "ACTIVE" as const, suspendedUntil: null, banReason: null }
      : body.action === "ban"
        ? { status: "BANNED" as const, suspendedUntil: null, banReason: reason }
        : {
            status: "SUSPENDED" as const,
            suspendedUntil: untilFor(body.action),
            banReason: reason,
          };
  await prisma.user.update({ where: { id: target.id }, data });
  await writeAudit({
    kind: `SANCTION_${body.action.toUpperCase()}`,
    userId: user.id,
    ip: "admin",
    detail: `${target.nickname}:${reason ?? ""}`,
  });
  return NextResponse.json({ ok: true });
}
