import type { Metadata } from "next";
import { BackToList } from "@/components/posts/back-to-list";
import { RequireLogin } from "@/components/auth/require-login";
import { BoardWriteForm } from "@/components/posts/board-write-form";
import { topicFromParam } from "@/lib/talk-topics";

export const metadata: Metadata = { title: "자유게시판 글쓰기", robots: { index: false } };

const CATEGORIES = [
  { boardType: "FREE" as const, label: "자유" },
  { boardType: "RULE_QA" as const, label: "질문" },
  { boardType: "SKETCH" as const, label: "현장 스케치" },
];

export default async function FreeWritePage({ searchParams }: { searchParams: Promise<{ type?: string; topic?: string }> }) {
  const { type, topic } = await searchParams;
  // 홈 「오늘의 이야기거리」에서 오면 제목을 미리 채움
  const topicTitle = topicFromParam(topic);
  const initial = CATEGORIES.find((category) => category.boardType === type)?.boardType ?? "FREE";
  return (
    <RequireLogin>
      <div className="flex flex-col gap-4">
        <BackToList href="/boards/free" className="self-start" />
        <header className="board-intro">
          <h1>자유게시판 작성</h1>
        </header>
        <BoardWriteForm
          boardType={initial}
          hint="자유 수다, 룰·판정 질문, 현장 이야기. 말머리를 골라 주세요"
          categories={CATEGORIES}
          initialTitle={topicTitle ?? undefined}
        />
      </div>
    </RequireLogin>
  );
}
