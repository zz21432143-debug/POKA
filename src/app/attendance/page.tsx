import { AuthorChip } from "@/components/posts/author-chip";
import { CommentForm } from "@/components/posts/comment-form";
import { getAttendanceStats } from "@/lib/attendance";
import { getCurrentUser } from "@/lib/current-user";
import { formatKstLabel } from "@/lib/dates";
import { ATTENDANCE_EXP, ATTENDANCE_POINTS } from "@/lib/rewards";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const user = await getCurrentUser().catch(() => null);
  const stats = await getAttendanceStats(user?.id);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">출석체크</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          매일 0시(KST) 기준 출석 글이 하나 열립니다. 댓글을 남기면 출석 처리되며 EXP {ATTENDANCE_EXP} /
          포인트 {ATTENDANCE_POINTS}가 지급됩니다. 1일 1회.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="오늘 날짜" value={formatKstLabel(stats.date)} />
        <Stat label="오늘 출석 인원" value={`${stats.todayCount}명`} />
        <Stat label="내 연속 출석" value={`${stats.myStreak}일`} />
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">{stats.post.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{stats.post.content}</p>
        <div className="mt-4">
          <CommentForm
            postId={stats.post.id}
            submitLabel="출석 댓글 남기기"
            placeholder="오늘 한 줄 (최소 2자). 예: 오늘도 핸드 공부"
            disabled={stats.alreadyCheckedIn}
            disabledReason="오늘은 이미 출석했습니다. 내일 0시 이후 다시 가능합니다."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">오늘 출석 현황</h2>
        {stats.comments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            아직 오늘 출석한 회원이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {stats.comments.map((row) => (
              <li key={row.id} className="flex min-h-12 items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <AuthorChip author={row.author} anonymous={false} />
                  <p className="truncate text-sm text-muted-foreground">{row.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
