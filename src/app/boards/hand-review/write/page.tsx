import { HandEditor } from "@/components/hand/hand-editor";
import { POST_EXP } from "@/lib/rewards";

export default function HandReviewWritePage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">핸드리뷰 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          손패·보드를 고르고 스트리트별 배팅 라인을 입력하세요. 등록 시 EXP {POST_EXP.HAND_REVIEW}가
          지급됩니다.
        </p>
      </header>
      <HandEditor />
    </div>
  );
}
