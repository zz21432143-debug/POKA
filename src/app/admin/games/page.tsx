import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CloseRoomButton, KickButton, RewardForm } from "@/components/admin/game-admin";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { loadWinReward } from "@/lib/game-reward";
import { nowMs } from "@/lib/dates";

export const metadata: Metadata = { title: "오락실 관리", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { waiting: "대기실", playing: "진행 중" };

/** 오락실 관리(마스터): 오목 · 윷놀이 방 실시간 목록 · 강제 닫기 · 대기실 강퇴 · 승리 보상 조정 */
export default async function AdminGamesPage() {
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer?.isMaster) notFound();
  const now = nowMs();
  const since = new Date(now - 2 * 3_600_000);
  const [omok, yut, reward] = await Promise.all([
    prisma.omokGame.findMany({ where: { status: { in: ["waiting", "playing"] }, updatedAt: { gte: since } }, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.yutGame.findMany({ where: { status: { in: ["waiting", "playing"] }, updatedAt: { gte: since } }, orderBy: { updatedAt: "desc" }, take: 50 }),
    loadWinReward(),
  ]);
  const ids = new Set<string>();
  for (const r of omok) for (const u of [r.hostId, r.guestId, r.blackId, r.whiteId]) if (u) ids.add(u);
  const yutSeats = new Map(
    yut.map((r) => {
      let seats: { team: string; idx: number; userId: string | null; bot?: boolean }[] = [];
      try {
        seats = JSON.parse(r.seatsJson);
      } catch {
        seats = [];
      }
      for (const s of seats) if (s.userId) ids.add(s.userId);
      return [r.id, seats] as const;
    }),
  );
  const users = new Map((await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, nickname: true } })).map((u) => [u.id, u.nickname]));
  const name = (id: string | null | undefined) => (id ? (users.get(id) ?? "?") : "—");
  const card = "rounded-2xl border border-border bg-card p-3 sm:p-4";
  const ago = (d: Date) => `${Math.max(0, Math.round((now - d.getTime()) / 60_000))}분 전`;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">🎮 오락실 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">최근 2시간 안에 움직인 오목 · 윷놀이 방이에요. 닫으면 전적 · 보상 없이 끝나요. 강퇴는 대기실에서만(다시 못 앉아요).</p>
      </header>

      <section aria-label="승리 보상" className={card}>
        <h2 className="mb-2 text-lg font-semibold">🎁 승리 보상(오목 · 윷놀이 공통)</h2>
        <RewardForm initial={reward} />
      </section>

      <section aria-label="오목 방" data-admin-omok-rooms className={card}>
        <h2 className="mb-2 text-lg font-semibold">⚫ 오목 방 {omok.length}개</h2>
        {omok.length ? (
          <ul className="grid gap-2">
            {omok.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                <span className="rounded-md bg-muted px-1.5 text-xs font-bold">{STATUS[r.status] ?? r.status}</span>
                <Link href={`/games/omok/${r.id}`} className="min-w-0 font-bold hover:underline">
                  {r.title || `${name(r.hostId)}의 방`}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                <span>
                  👑 {name(r.hostId)} vs {r.guestId ? name(r.guestId) : "빈자리"}
                </span>
                {r.status === "waiting" && r.guestId ? <KickButton game="omok" id={r.id} userId={r.guestId} name={name(r.guestId)} /> : null}
                {r.isPrivate ? <span className="text-xs">🔒</span> : null}
                <span className="ml-auto text-xs text-muted-foreground">{ago(r.updatedAt)}</span>
                <CloseRoomButton game="omok" id={r.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">지금 열린 오목 방이 없어요.</p>
        )}
      </section>

      <section aria-label="윷놀이 방" data-admin-yut-rooms className={card}>
        <h2 className="mb-2 text-lg font-semibold">🎲 윷놀이 방 {yut.length}개</h2>
        {yut.length ? (
          <ul className="grid gap-2">
            {yut.map((r) => {
              const seats = yutSeats.get(r.id) ?? [];
              return (
                <li key={r.id} className="grid gap-1.5 rounded-xl border border-border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-muted px-1.5 text-xs font-bold">{STATUS[r.status] ?? r.status}</span>
                    <span className="rounded-md bg-muted px-1.5 text-xs font-bold">
                      {r.mode}:{r.mode}
                    </span>
                    <Link href={`/games/yut/${r.id}`} className="min-w-0 font-bold hover:underline">
                      {r.title || `${name(r.hostId)}의 방`}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{ago(r.updatedAt)}</span>
                    <CloseRoomButton game="yut" id={r.id} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {seats.map((s) => (
                      <span key={`${s.team}${s.idx}`} className={`flex items-center gap-1 rounded-md px-1.5 text-xs ${s.team === "A" ? "bg-rose-950/60" : "bg-sky-950/60"}`}>
                        {s.team === "A" ? "홍" : "청"}
                        {s.idx + 1} {s.userId ? name(s.userId) : s.bot ? "🤖" : "빈자리"}
                        {r.status === "waiting" && s.userId && s.userId !== r.hostId ? <KickButton game="yut" id={r.id} userId={s.userId} name={name(s.userId)} /> : null}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">지금 열린 윷놀이 방이 없어요.</p>
        )}
      </section>
    </div>
  );
}
