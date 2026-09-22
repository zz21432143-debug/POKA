import { HandEditor } from "@/components/hand/hand-editor";
import { POST_EXP } from "@/lib/rewards";

export default function HandReviewWritePage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">핸드리뷰 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          손패·보드·자리는 테이블에 바로 그려집니다. 상대 카드 두 장을 넣고 공개를 켜면 다른 사람도
          그 핸드를 볼 수 있습니다. 등록 후 Fold/Check/Call/Raise 투표가 붙고 EXP{" "}
          {POST_EXP.HAND_REVIEW}가 지급됩니다.
        </p>
      </header>
      <HandEditor />
    </div>
  );
}
