import { prisma } from "@/lib/db";
import { formatKstLabel } from "@/lib/dates";

export type AccountStatusValue = "ACTIVE" | "SUSPENDED" | "BANNED";

export type RestrictableUser = {
  id: string;
  status?: AccountStatusValue | string | null;
  suspendedUntil?: Date | string | null;
  banReason?: string | null;
};

export class AccountRestrictedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountRestrictedError";
  }
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRestrictionMessage(user: RestrictableUser): string | null {
  const status = (user.status ?? "ACTIVE").toString().toUpperCase();
  const reason = user.banReason?.trim() || "운영 정책 위반";
  if (status === "BANNED") {
    return `영구 정지된 계정입니다. 사유: ${reason}`;
  }
  if (status === "SUSPENDED") {
    const until = asDate(user.suspendedUntil);
    if (until && until.getTime() > Date.now()) {
      const kst = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(until);
      return `${formatKstLabel(kst)}까지 이용이 정지된 계정입니다. 사유: ${reason}`;
    }
  }
  return null;
}

export async function liftExpiredSuspension(user: RestrictableUser) {
  const status = (user.status ?? "ACTIVE").toString().toUpperCase();
  if (status !== "SUSPENDED") return { ...user, status: status as AccountStatusValue };
  const until = asDate(user.suspendedUntil);
  if (until && until.getTime() > Date.now()) return user;
  await prisma.user.update({
    where: { id: user.id },
    data: { status: "ACTIVE", suspendedUntil: null },
  });
  return { ...user, status: "ACTIVE" as const, suspendedUntil: null };
}

export async function assertAccountActive(user: RestrictableUser) {
  const fresh = await liftExpiredSuspension(user);
  const message = formatRestrictionMessage(fresh);
  if (message) throw new AccountRestrictedError(message);
}

export async function assertAccountActiveById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, suspendedUntil: true, banReason: true },
  });
  if (!user) throw new AccountRestrictedError("로그인된 회원이 없습니다.");
  await assertAccountActive(user);
}
