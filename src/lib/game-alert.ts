import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";

/** 하루 최대 알림 수(오목 · 윷 합쳐) · 알림 사이 최소 간격 */
const DAY_MAX = 2;
const GAP_MS = 60 * 60_000;

/**
 * 공개 대기실이 새로 열리면 「상대 찾는 중」 알림(켠 기기만).
 * 하루 2번 · 1시간에 한 번까지만(알림 피로 막기).
 */
export async function alertWaitingRoom(game: "omok" | "yut", roomId: string, hostId: string) {
  // 밤 11시 ~ 아침 9시(KST)엔 보내지 않음
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", hour12: false }).format(new Date()));
  if (hour >= 23 || hour < 9) return 0;
  const day = todayKstDate();
  const [sentToday, last] = await Promise.all([
    prisma.toolSaved.count({ where: { kind: "game-alert-sent", name: day } }).catch(() => DAY_MAX),
    prisma.toolSaved.findFirst({ where: { kind: "game-alert-sent" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }).catch(() => null),
  ]);
  if (sentToday >= DAY_MAX) return 0;
  if (last && Date.now() - last.createdAt.getTime() < GAP_MS) return 0;
  // 같은 시간대(1시간 칸)에 한 번만(동시에 방이 여러 개 열려도)
  const slot = Math.floor(Date.now() / GAP_MS);
  const made = await prisma.toolSaved
    .createMany({ data: [{ id: `gamealert_${slot}`, ownerId: "site", kind: "game-alert-sent", name: day, dataJson: JSON.stringify({ game, roomId }) }], skipDuplicates: true })
    .catch(() => ({ count: 0 }));
  if (made.count !== 1) return 0;
  const host = await prisma.user.findUnique({ where: { id: hostId }, select: { nickname: true } }).catch(() => null);
  const { notifyGameAlert } = await import("@/lib/push");
  const label = game === "omok" ? "요괴 오목" : "요괴 윷놀이";
  const r = await notifyGameAlert(hostId, {
    title: `🏮 지금 ${label} 상대를 찾고 있어요`,
    body: `${host?.nickname ?? "누군가"}님이 방을 열었어요. 눌러서 바로 한 판!`,
    url: `/games/${game}/${roomId}?from=push-game`,
  }).catch(() => ({ sent: 0 }));
  return r.sent ?? 0;
}
