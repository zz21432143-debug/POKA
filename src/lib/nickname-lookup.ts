import { prisma } from "@/lib/db";
import { nicknameError, normalizeNickname } from "@/lib/nickname";

export async function findNicknameOwner(nickname: string, exceptUserId?: string) {
  const next = normalizeNickname(nickname);
  if (!next) return null;
  return prisma.user.findFirst({
    where: {
      nickname: { equals: next, mode: "insensitive" },
      ...(exceptUserId ? { NOT: { id: exceptUserId } } : {}),
    },
    select: { id: true, nickname: true },
  });
}

export async function nicknameAvailability(nickname: string, exceptUserId?: string) {
  const next = normalizeNickname(nickname);
  const invalid = nicknameError(next);
  if (invalid) return { ok: false as const, nickname: next, error: invalid };
  const owner = await findNicknameOwner(next, exceptUserId);
  if (owner) return { ok: false as const, nickname: next, error: "이미 쓰는 닉네임입니다." };
  return { ok: true as const, nickname: next, error: null };
}
