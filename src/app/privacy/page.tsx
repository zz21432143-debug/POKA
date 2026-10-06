export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">개인정보처리방침</h1>
      <p className="mt-3 text-sm text-muted-foreground">시행일 2026-09-22</p>
      <section className="mt-6 space-y-4 text-[15px] leading-7">
        <p>
          POKA는 서비스 제공을 위해 닉네임, 레벨·경험치, 출석 기록, 그리고 게시 시
          접속 IP를 처리합니다.
        </p>
        <p>
          매장후기는 화면에 작성자를 표시하지 않습니다. 악성 루머·명예훼손 대응을 위해
          내부적으로 계정과 IP, 신고 이력을 보관하며 관리자만 열람합니다.
        </p>
        <p>
          광고 영역은 Google AdSense 연동을 위한 자리입니다. 연동 후에는 광고 네트워크의
          쿠키·식별자가 추가로 수집될 수 있습니다.
        </p>
        <p>문의: pokerwiki.co.kr 관리 메뉴 또는 게시글 신고 기능을 이용해 주세요.</p>
      </section>
    </article>
  );
}
