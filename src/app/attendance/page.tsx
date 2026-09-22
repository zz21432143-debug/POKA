import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  let rows: { id: string; content: string; nickname: string | null; createdAt: Date }[] = [];
  try {
    rows = (
      await prisma.comment.findMany({
        where: { isAttendanceCheck: true },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { nickname: true } } },
      })
    ).map((row) => ({
      id: row.id,
      content: row.content,
      nickname: row.author?.nickname ?? null,
      createdAt: row.createdAt,
    }));
  } catch {
    rows = [];
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">출석체크</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          출석 기록은 Comment.isAttendanceCheck 로 저장됩니다. 출석 버튼은 다음 단계에서 연결합니다.
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          오늘 아직 출석 기록이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((row) => (
            <li key={row.id} className="flex min-h-12 items-center justify-between gap-3 px-3 py-3">
              <div>
                <p className="font-medium">{row.nickname ?? "익명"}</p>
                <p className="text-sm text-muted-foreground">{row.content}</p>
              </div>
              <time className="text-xs text-muted-foreground">
                {row.createdAt.toISOString().slice(0, 10)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
