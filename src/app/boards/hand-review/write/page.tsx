import { RequireLogin } from "@/components/auth/require-login";
import { HandEditor } from "@/components/hand/hand-editor";
import { POST_EXP } from "@/lib/rewards";

export default function HandReviewWritePage() {
  return (
    <RequireLogin>
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-semibold">핸드리뷰 작성</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            손패·보드·자리는 테이블에 바로 그려집니다. 제목은 저장 시 ‘홀덤 핸드리뷰 |’가 붙습니다.
            등록 후 Fold/Check/Call/Raise 투표가 붙고 EXP {POST_EXP.HAND_REVIEW}가 지급됩니다.
          </p>
        </header>
        <HandEditor />
      </div>
    </RequireLogin>
  );
}
