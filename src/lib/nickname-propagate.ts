import { prisma } from "@/lib/db";

/**
 * 닉네임이 바뀌면 사이트에 글자로 남아 있던 옛 닉네임도 새 닉네임으로(글 · 댓글 · 프로필은 회원 id로 이어져 자동).
 * - 전광판: 옛 닉네임이 들어간 소식은 지움(비속어 닉네임이 남지 않게)
 * - 관전자 · 오목 응원 · 도전 줄 · 회원 기록(JSON) 속 이름: 바꿈
 * - 랭킹 · 칭호 · 홈 랭킹 캐시: 비움(바로 새 이름으로 다시 계산)
 */
export async function propagateNickname(userId: string, from: string, to: string) {
  if (!from || from === to) return;
  const quoted = JSON.stringify(from);
  const quotedTo = JSON.stringify(to);
  await Promise.all([
    import("@/lib/ticker").then((m) => m.forgetTickerName(from)).catch(() => undefined),
    prisma.gameWatch.updateMany({ where: { nickname: from }, data: { nickname: to } }).catch(() => undefined),
    // 진행 중인 오목 방: 응원 · 도전 줄의 "n":"옛 닉네임"
    prisma.$executeRaw`UPDATE "OmokGame" SET "emoteJson" = replace("emoteJson", ${`"n":${quoted}`}, ${`"n":${quotedTo}`}), "queueJson" = replace("queueJson", ${`"n":${quoted}`}, ${`"n":${quotedTo}`}), version = version + 1
      WHERE status <> 'done' AND ("emoteJson" LIKE ${`%"n":${quoted}%`} OR "queueJson" LIKE ${`%"n":${quoted}%`})`.catch(() => undefined),
    // 이 회원 기록(JSON) 속 이름
    prisma.$executeRaw`UPDATE "ToolSaved" SET "dataJson" = replace("dataJson", ${quoted}, ${quotedTo})
      WHERE "ownerId" = ${userId} AND kind <> 'nick-forced' AND "dataJson" LIKE ${`%${quoted}%`}`.catch(() => undefined),
  ]);
  const [{ clearHonorCache }, { clearHomeRankings }] = await Promise.all([import("@/lib/pot-titles"), import("@/lib/home-rankings")]);
  clearHonorCache();
  clearHomeRankings();
}
