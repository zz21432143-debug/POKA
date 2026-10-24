import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { PushFoldQuiz } from "@/components/study/push-fold-quiz";

const TITLE = "푸시폴드 퀴즈 — 이 스택, 이 패면 올인? 폴드? (GTO 차트로 채점)";
const DESCRIPTION = "6인 · 9인 토너먼트에서 앞이 모두 폴드했을 때 5~15BB로 올인할지 폴드할지 맞혀 보세요. 정답은 POKA GTO 푸시폴드 차트 기준이에요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/study/push-fold-quiz" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/study/push-fold-quiz" },
};

/** 푸시폴드 상황 연습 문제 */
export default function PushFoldQuizPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[#9CA3AF]">
        <Link href="/study" className="text-[#E5E7EB] hover:text-[#C59B27]">
          홀덤 공부
        </Link>
      </p>
      <header className="board-intro">
        <h1>🎯 푸시폴드 퀴즈</h1>
        <p className="mt-2">짧은 스택일 때 올인할지 폴드할지 맞혀 보세요. 정답은 GTO 푸시폴드 차트와 같은 데이터로 채점해요. 점수는 이 기기에만 저장돼요.</p>
      </header>
      <PushFoldQuiz />
    </div>
  );
}
