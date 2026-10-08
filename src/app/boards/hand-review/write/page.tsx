import { RequireLogin } from "@/components/auth/require-login";
import { HandEditor } from "@/components/hand/hand-editor";
import { postRewardLine } from "@/lib/rewards";

export default function HandReviewWritePage() {
  return (
    <RequireLogin>
      <div className="flex flex-col gap-4">
        <header className="board-intro">
          <h1>핸드리뷰 작성</h1>
          <p className="mt-2">
            자리·카드·액션만 넣으면 테이블이 그려집니다. 제목 앞에는 ‘홀덤 핸드리뷰 |’가 붙고,
            등록 후 폴드/체크/콜/레이즈 투표가 열립니다. {postRewardLine("HAND_REVIEW")}.
          </p>
        </header>
        <HandEditor />
      </div>
    </RequireLogin>
  );
}
