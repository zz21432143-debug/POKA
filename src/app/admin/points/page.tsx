import type { Metadata } from "next";
import Link from "next/link";
import { nowMs } from "@/lib/dates";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { normalizeNickname } from "@/lib/nickname";
import { ADMIN_POINT_LIMIT, cosmeticRefundFor, recentAdminPointLogs, refundAmountFor } from "@/lib/admin-points";
import { BulkGrantForm, PointGrantForm, MarkRefundButton } from "@/components/admin/points-admin";
import { RefundRequestsAdmin } from "@/components/admin/refund-requests-admin";
import { listRefundRequests } from "@/lib/refund-requests";

export const metadata: Metadata = { title: "포인트 · 마크 환불", robots: { index: false } };
export const dynamic = "force-dynamic";

const fmt = (d: Date | string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

/** 마스터: 회원 찾기 → 포인트 지급 · 회수 / 가진 마크 환불(마크 회수 + 포인트 돌려줌) · 모든 처리 기록 */
export default async function AdminPointsPage({ searchParams }: { searchParams: Promise<{ q?: string; u?: string }> }) {
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer?.isMaster) notFound();
  const sp = await searchParams;
  const q = normalizeNickname(sp.q ?? "");
  const found = q
    ? await prisma.user.findMany({
        where: { withdrawnAt: null, OR: [{ nickname: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] },
        orderBy: { lastLoginAt: { sort: "desc", nulls: "last" } },
        take: 12,
        select: { id: true, nickname: true, level: true, points: true },
      })
    : [];
  const picked = sp.u
    ? await prisma.user.findUnique({
        where: { id: sp.u },
        select: {
          id: true,
          nickname: true,
          level: true,
          points: true,
          equippedMarkId: true,
          equippedFrameId: true,
          equippedEffectId: true,
          ownedMarks: { orderBy: { purchasedAt: "desc" }, include: { mark: true } },
          ownedCosmetics: { orderBy: { purchasedAt: "desc" }, include: { cosmetic: true } },
        },
      })
    : null;
  const marks = picked
    ? await Promise.all(picked.ownedMarks.map(async (o) => ({ ...o, refund: await refundAmountFor(picked.id, o.mark) })))
    : [];
  const cosmetics = picked
    ? await Promise.all(picked.ownedCosmetics.map(async (o) => ({ ...o, refund: await cosmeticRefundFor(picked.id, o.cosmetic) })))
    : [];
  const logs = await recentAdminPointLogs(40, picked?.id);
  const pendingRequests = await listRefundRequests({ pendingOnly: true, limit: 50 });
  // 엑셀 받기: 이번 달 · 지난달
  const ym = (offset: number) => {
    const d = new Date(nowMs() + 9 * 3600_000);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + offset);
    return d.toISOString().slice(0, 7);
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">💰 포인트 지급 · 마크 환불</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          회원을 찾아 포인트를 지급하거나 회수하고, 가진 마크를 환불합니다. 한 번에 {ADMIN_POINT_LIMIT.toLocaleString()}P까지 · 사유는 꼭 적어 주세요(아래 기록에 남고 회원에게 알림이 가요).
        </p>
      </header>

      {pendingRequests.length ? <RefundRequestsAdmin requests={pendingRequests.map((r) => ({ id: r.id, at: r.at, nickname: r.nickname, userId: r.userId, kind: r.kind, name: r.name, reason: r.reason }))} /> : null}

      <div data-points-export className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="font-semibold">📥 기록 엑셀로 받기:</span>
        {[0, -1].map((o) => (
          <a key={o} href={`/api/admin/points/export?month=${ym(o)}`} className="rounded-full border border-border px-3 py-1 text-xs font-bold">
            {Number(ym(o).slice(5))}월
          </a>
        ))}
        <a href="/api/admin/points/export" className="rounded-full border border-border px-3 py-1 text-xs font-bold">
          최근 90일
        </a>
      </div>

      <BulkGrantForm />

      <form className="flex gap-2" action="/admin/points">
        <input name="q" defaultValue={q} placeholder="닉네임 또는 이메일" className="min-h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm" />
        <button className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">찾기</button>
      </form>

      {q ? (
        <section className="rounded-xl border border-border bg-card p-3">
          <p className="mb-2 text-sm font-semibold">찾은 회원 {found.length}명</p>
          {found.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {found.map((u) => (
                <li key={u.id}>
                  <Link
                    data-points-pick={u.nickname}
                    href={`/admin/points?q=${encodeURIComponent(q)}&u=${u.id}`}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm ${picked?.id === u.id ? "border-primary bg-primary/15 font-bold" : "border-border"}`}
                  >
                    {u.nickname} <span className="text-xs text-muted-foreground">Lv.{u.level} · {u.points.toLocaleString()}P</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">없어요. 닉네임 일부만 넣어 보세요.</p>
          )}
        </section>
      ) : null}

      {picked ? (
        <section data-points-user className="grid gap-3 rounded-xl border border-primary/40 bg-card p-3">
          <p className="text-lg font-black">
            {picked.nickname} <span className="text-sm font-normal text-muted-foreground">Lv.{picked.level}</span>
            <span data-points-now className="ml-2 text-[#ffcf4a]">{picked.points.toLocaleString()}P</span>
          </p>
          <PointGrantForm userId={picked.id} nickname={picked.nickname} />
          <div>
            <p className="mb-1.5 text-sm font-semibold">가진 마크 {marks.length}개</p>
            {marks.length ? (
              <ul className="grid gap-1.5">
                {marks.map((o) => (
                  <li key={o.markId} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.mark.imageUrl} alt="" width={32} height={32} className="size-8 rounded-lg bg-white object-contain" />
                    <span className="min-w-0 flex-1 text-sm">
                      <b>{o.mark.name}</b>
                      {picked.equippedMarkId === o.markId ? <span className="ml-1 rounded bg-primary/20 px-1 text-[11px]">착용 중</span> : null}
                      <span className="block text-xs text-muted-foreground">
                        {fmt(o.purchasedAt)} · 상점가 {o.mark.pricePoints.toLocaleString()}P{o.refund.known ? "" : " (산 값 기록 없음 → 상점가)"}
                      </span>
                    </span>
                    <MarkRefundButton userId={picked.id} markId={o.markId} markName={o.mark.name} defaultAmount={o.refund.amount} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">가진 마크가 없어요.</p>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">가진 프레임 · 이펙트 {cosmetics.length}개</p>
            {cosmetics.length ? (
              <ul className="grid gap-1.5">
                {cosmetics.map((o) => (
                  <li key={o.cosmeticId} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                    <span className="min-w-0 flex-1 text-sm">
                      <b>{o.cosmetic.name}</b> <span className="text-xs text-muted-foreground">{o.cosmetic.kind === "FRAME" ? "프레임" : "이펙트"}</span>
                      {picked.equippedFrameId === o.cosmeticId || picked.equippedEffectId === o.cosmeticId ? <span className="ml-1 rounded bg-primary/20 px-1 text-[11px]">착용 중</span> : null}
                      <span className="block text-xs text-muted-foreground">
                        {fmt(o.purchasedAt)} · 상점가 {o.cosmetic.pricePoints.toLocaleString()}P{o.refund.known ? "" : " (산 값 기록 없음 → 상점가)"}
                      </span>
                    </span>
                    <MarkRefundButton kind="cosmetic" userId={picked.id} markId={o.cosmeticId} markName={o.cosmetic.name} defaultAmount={o.refund.amount} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">가진 프레임 · 이펙트가 없어요.</p>
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-3">
        <p className="mb-2 text-sm font-semibold">{picked ? `${picked.nickname} 처리 기록` : "최근 처리 기록"}</p>
        {logs.length ? (
          <ul data-points-logs className="grid gap-1 text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap gap-x-2 border-b border-border/50 py-1">
                <span className="text-xs text-muted-foreground">{fmt(l.at)}</span>
                <b>{l.targetNickname ?? "(탈퇴)"}</b>
                <span className={l.amount >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {l.kind === "admin-mark-refund" ? `마크 환불 [${l.mark ?? ""}] +` : l.kind === "admin-cosmetic-refund" ? `상품 환불 [${l.mark ?? ""}] +` : l.amount > 0 ? "+" : ""}
                  {l.amount.toLocaleString()}P
                </span>
                <span className="text-muted-foreground">· {l.reason} · {l.by}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">아직 기록이 없어요.</p>
        )}
      </section>
    </div>
  );
}
