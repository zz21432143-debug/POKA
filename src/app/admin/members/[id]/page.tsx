import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { VerifyToggle } from "@/components/admin/verify-toggle";
import { ForceNickname, GrantNickTicket } from "@/components/admin/force-nickname";
import { gameRecord, recordLine } from "@/lib/game-stats";
import { profileYokai } from "@/lib/yokai-server";
import { inviteStats } from "@/lib/invite";
import { ensurePointLedger } from "@/lib/point-ledger";

export const metadata: Metadata = { title: "회원 상세", robots: { index: false } };
export const dynamic = "force-dynamic";

const dt = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d) : "-";

function Card({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="grid content-start gap-2 rounded-2xl border border-border bg-[#151213] p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
      <dd className="min-w-0 break-all text-white">{v}</dd>
    </div>
  );
}

/** 회원 상세(마스터): 기본 정보 · 활동 · 신고 · 포인트 기록 · 게임 · 요괴 · 초대 · 닉네임/관리 기록 · 바로 조치 */
export default async function AdminMemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer?.isMaster) notFound();
  const { id } = await params;
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) notFound();
  await ensurePointLedger().catch(() => undefined);
  const [posts, comments, postCount, commentCount, attendDays, reportsAgainst, reportsMade, ledger, omok, yut, recentOmok, yk, invites, nickHistory, audits] = await Promise.all([
    prisma.post.findMany({ where: { authorId: id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, title: true, boardType: true, hidden: true, createdAt: true } }),
    prisma.comment.findMany({ where: { authorId: id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, content: true, postId: true, createdAt: true } }),
    prisma.post.count({ where: { authorId: id } }),
    prisma.comment.count({ where: { authorId: id } }),
    prisma.dailyAttendance.count({ where: { userId: id } }),
    prisma.report.findMany({
      where: { OR: [{ post: { authorId: id } }, { comment: { authorId: id } }] },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, reason: true, status: true, createdAt: true, targetType: true, reporter: { select: { nickname: true } } },
    }),
    prisma.report.count({ where: { reporterId: id } }),
    prisma.$queryRaw<{ delta: number; reason: string; createdAt: Date }[]>`SELECT delta, reason, "createdAt" FROM "PointLedger" WHERE "userId" = ${id} ORDER BY "createdAt" DESC LIMIT 20`.catch(() => []),
    gameRecord(id, "omok").catch(() => null),
    gameRecord(id, "yut").catch(() => null),
    prisma.omokGame.findMany({
      where: { status: "done", endReason: { not: "cancel" }, OR: [{ blackId: id }, { whiteId: id }] },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, blackId: true, whiteId: true, winner: true, endReason: true, updatedAt: true },
    }),
    profileYokai(id).catch(() => null),
    inviteStats(id).catch(() => null),
    prisma.toolSaved.findMany({ where: { ownerId: id, kind: "nick-forced" }, orderBy: { createdAt: "desc" }, take: 10, select: { dataJson: true, name: true, createdAt: true } }),
    prisma.auditLog.findMany({ where: { OR: [{ userId: id }, { detail: { contains: u.nickname } }] }, orderBy: { createdAt: "desc" }, take: 10, select: { kind: true, detail: true, ip: true, createdAt: true } }),
  ]);
  const oppIds = [...new Set(recentOmok.flatMap((g) => [g.blackId, g.whiteId]).filter((x): x is string => Boolean(x) && x !== id))];
  const opp = new Map((await prisma.user.findMany({ where: { id: { in: oppIds } }, select: { id: true, nickname: true } })).map((x) => [x.id, x.nickname]));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-2">
        <Link href="/admin/members" className="text-sm text-primary">
          ← 회원 목록
        </Link>
        <h1 className="w-full text-2xl font-semibold">
          👤 {u.nickname}
          {u.isDealerVerified ? <span className="ml-2 rounded bg-[#c9a25c] px-1.5 text-xs text-black">인증</span> : null}
          {u.isAdmin ? <span className="ml-1 rounded bg-sky-700 px-1.5 text-xs">관리자</span> : null}
          {u.status !== "ACTIVE" ? <span className="ml-1 rounded bg-rose-700 px-1.5 text-xs">{u.status === "BANNED" ? "차단" : "정지"}</span> : null}
          {u.withdrawnAt ? <span className="ml-1 rounded bg-zinc-700 px-1.5 text-xs">탈퇴</span> : null}
        </h1>
        <div data-member-actions className="flex flex-wrap items-center gap-2">
          <VerifyToggle nickname={u.nickname} verified={u.isDealerVerified} />
          <ForceNickname nickname={u.nickname} />
          <GrantNickTicket nickname={u.nickname} />
          <Link href={`/admin?tab=sanctions&q=${encodeURIComponent(u.nickname)}`} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-xs font-bold">
            제재(정지 · 차단)
          </Link>
          <Link href={`/u/${encodeURIComponent(u.nickname)}`} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-xs font-bold">
            프로필 보기
          </Link>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="기본 정보">
          <dl className="grid gap-1">
            <Row k="이메일" v={u.email ?? "-"} />
            <Row k="로그인" v={[u.kakaoId ? "카카오" : null, u.googleId ? "구글" : null].filter(Boolean).join(" · ") || "-"} />
            <Row k="가입" v={`${dt(u.createdAt)} · IP ${u.signupIp ?? "-"}`} />
            <Row k="최근 접속" v={dt(u.lastLoginAt)} />
            <Row k="레벨" v={`Lv.${u.level} · EXP ${u.exp.toLocaleString()}`} />
            <Row k="포인트" v={`${u.points.toLocaleString()}P`} />
            <Row k="닉네임" v={`바꾼 횟수 ${u.nicknameChangeCount} · 변경권 ${u.nicknameTickets}장`} />
            <Row k="상태" v={u.status === "ACTIVE" ? "정상" : `${u.status === "BANNED" ? "차단" : "정지"}${u.suspendedUntil ? ` (~${dt(u.suspendedUntil)})` : ""} · ${u.banReason ?? ""}`} />
          </dl>
        </Card>

        <Card title="활동">
          <dl className="grid gap-1">
            <Row k="글 · 댓글" v={`글 ${postCount.toLocaleString()} · 댓글 ${commentCount.toLocaleString()}`} />
            <Row k="출석" v={`누적 ${attendDays}일 · 연속 ${u.attendanceStreak}일 (마지막 ${u.lastAttendanceDate ?? "-"})`} />
            <Row k="신고" v={`받은 신고 ${reportsAgainst.length}건+ · 한 신고 ${reportsMade}건`} />
            <Row k="요괴" v={yk ? `${yk.name}(${yk.stageName}) · 도감 ${yk.count}종` : "없음"} />
            <Row k="초대" v={invites ? `첫 출석 완료 ${invites.done}명 · 가입만 ${invites.pending}명` : "-"} />
            <Row k="오목" v={omok ? `${recordLine(omok)} · 승률 ${omok.rate}%` : "-"} />
            <Row k="윷놀이" v={yut ? `${recordLine(yut)} · 승률 ${yut.rate}%` : "-"} />
          </dl>
        </Card>

        <Card title={`최근 글 (${postCount})`}>
          {posts.length ? (
            <ul className="grid gap-1 text-sm">
              {posts.map((p) => (
                <li key={p.id} className="flex gap-2">
                  <span className="shrink-0 text-xs text-muted-foreground">{dt(p.createdAt)}</span>
                  <Link href={`/posts/${p.id}`} className="min-w-0 truncate hover:text-primary">
                    {p.hidden ? "🚫 " : ""}
                    {p.title || "(제목 없음)"}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">없음</p>
          )}
        </Card>

        <Card title={`최근 댓글 (${commentCount})`}>
          {comments.length ? (
            <ul className="grid gap-1 text-sm">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span className="shrink-0 text-xs text-muted-foreground">{dt(c.createdAt)}</span>
                  <Link href={`/posts/${c.postId}`} className="min-w-0 truncate hover:text-primary">
                    {c.content.slice(0, 60)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">없음</p>
          )}
        </Card>

        <Card title="받은 신고(최근)">
          {reportsAgainst.length ? (
            <ul className="grid gap-1 text-sm">
              {reportsAgainst.map((r) => (
                <li key={r.id} className="flex flex-wrap gap-x-2">
                  <span className="text-xs text-muted-foreground">{dt(r.createdAt)}</span>
                  <span>{r.targetType === "comment" ? "댓글" : "글"}</span>
                  <span className="text-rose-200">{r.reason}</span>
                  <span className="text-xs text-muted-foreground">
                    by {r.reporter.nickname} · {r.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-300">받은 신고가 없어요</p>
          )}
        </Card>

        <Card title="포인트 기록(최근 20)">
          {ledger.length ? (
            <ul className="grid gap-1 text-sm">
              {ledger.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 text-xs text-muted-foreground">{dt(l.createdAt)}</span>
                  <span className="font-bold text-[#e7c98a] tabular-nums">+{l.delta}P</span>
                  <span className="text-muted-foreground">{l.reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">기록이 없어요</p>
          )}
        </Card>

        <Card title="오목 최근 대국">
          {recentOmok.length ? (
            <ul className="grid gap-1 text-sm">
              {recentOmok.map((g) => {
                const mine = g.blackId === id ? 1 : 2;
                const res = !g.winner ? "무" : g.winner === mine ? "승" : "패";
                const o = opp.get((mine === 1 ? g.whiteId : g.blackId) ?? "") ?? "?";
                return (
                  <li key={g.id} className="flex gap-2">
                    <span className="shrink-0 text-xs text-muted-foreground">{dt(g.updatedAt)}</span>
                    <b className={res === "승" ? "text-[#f5c451]" : res === "패" ? "text-rose-300" : ""}>{res}</b>
                    <Link href={`/games/omok/${g.id}`} className="hover:text-primary">
                      vs {o} · {g.endReason}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">없음</p>
          )}
        </Card>

        <Card title="닉네임 · 관리 기록">
          {nickHistory.length ? (
            <ul className="grid gap-1 text-sm">
              {nickHistory.map((h, i) => {
                let v: { from?: string; to?: string; reason?: string } = {};
                try {
                  v = JSON.parse(h.dataJson);
                } catch {
                  v = {};
                }
                return (
                  <li key={i}>
                    <span className="text-xs text-muted-foreground">{dt(h.createdAt)}</span> 강제 변경 「{v.from}」 → 「{v.to}」 ({v.reason}) · {h.name === "seen" ? "본인 확인함" : "아직 확인 안 함"}
                  </li>
                );
              })}
            </ul>
          ) : null}
          {audits.length ? (
            <ul className="grid gap-1 text-sm">
              {audits.map((a, i) => (
                <li key={i} className="text-muted-foreground">
                  <span className="text-xs">{dt(a.createdAt)}</span> <b className="text-white">{a.kind}</b> {a.detail ?? ""} <span className="text-xs">({a.ip})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">관리 기록이 없어요</p>
          )}
        </Card>
      </div>
    </div>
  );
}
