import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { AdminNav } from "@/components/admin/admin-nav";
import { QuizAdmin } from "@/components/admin/quiz-admin";

export const metadata: Metadata = { title: "퀴즈 관리", robots: { index: false } };
export const dynamic = "force-dynamic";

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
        <div className="mt-2">
          <AdminNav current="/admin/quiz" isMaster={user.isMaster} />
        </div>
      </header>
      <QuizAdmin />
    </div>
  );
}
