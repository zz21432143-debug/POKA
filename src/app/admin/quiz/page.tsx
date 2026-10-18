import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { QuizAdmin } from "@/components/admin/quiz-admin";
import { quizDailyStats } from "@/lib/quiz-stats";

export const metadata: Metadata = { title: "퀴즈 관리", robots: { index: false } };
export const dynamic = "force-dynamic";

/** 최근 14일 퀴즈 풀이: 메인 퀴즈가 처음 온 사람을 붙잡는지(비회원 · 그날 가입) 보는 표 */
async function QuizDailyTable() {
  const days = await quizDailyStats(14);
  const sum = (k: "guests" | "members" | "fresh", from: number, to: number) => days.slice(from, to).reduce((a, d) => a + d[k], 0);
  const week = { guests: sum("guests", 0, 7), members: sum("members", 0, 7), fresh: sum("fresh", 0, 7) };
  const prev = { guests: sum("guests", 7, 14), members: sum("members", 7, 14), fresh: sum("fresh", 7, 14) };
  const diff = (a: number, b: number) => (a === b ? "같음" : a > b ? `▲${a - b}` : `▼${b - a}`);
  return (
    <section data-quiz-daily className="grid gap-2 rounded-2xl border border-border bg-[#151213] p-4">
      <h2 className="text-base font-semibold">최근 14일 퀴즈 풀이</h2>
      <p className="text-xs text-muted-foreground">
        비회원 풀이는 2026-10-19부터 세기 시작했어요. 「그날 가입」은 가입한 날 바로 퀴즈를 푼 회원 수 — 퀴즈로 들어와 가입했는지 보는 숫자예요.
      </p>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        {(
          [
            ["비회원", week.guests, prev.guests],
            ["회원", week.members, prev.members],
            ["그날 가입", week.fresh, prev.fresh],
          ] as const
        ).map(([label, a, b]) => (
          <div key={label} className="rounded-xl bg-black/30 p-2">
            <p className="text-xs text-muted-foreground">최근 7일 {label}</p>
            <b className="text-xl tabular-nums">{a.toLocaleString()}</b>
            <p className="text-xs text-muted-foreground">지난주보다 {diff(a, b)}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1 text-left">날짜</th>
              <th className="py-1 text-right">비회원</th>
              <th className="py-1 text-right">회원</th>
              <th className="py-1 text-right">그날 가입</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day} className="border-t border-border">
                <td className="py-1">{d.day.slice(5).replace("-", "/")}</td>
                <td className="py-1 text-right">{d.guests}</td>
                <td className="py-1 text-right">{d.members}</td>
                <td className="py-1 text-right">{d.fresh}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** 오늘의 퀴즈 관리: 날짜별 문제 보기 · 직접 문제 넣기(아직 아무도 안 풀었을 때만) */
export default async function AdminQuizPage() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">퀴즈 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          문제는 매일 자동으로 만들어집니다(푸시폴드 · 승률 · 족보 · 레인지 돌아가며). 오늘이나 앞으로의 날짜에 직접 문제를 넣으면 그날은 그 문제가 나가요. 이미 누가 답한 문제는 바꿀 수 없습니다.
        </p>
      </header>
      <QuizDailyTable />
      <QuizAdmin />
    </div>
  );
}
