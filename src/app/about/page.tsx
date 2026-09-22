export default function AboutPage() {
  return (
    <article className="prose-legal mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">사이트 소개</h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        POKA는 포커 플레이어와 딜러가 핸드를 나누고, 매장을 후기하며, 구인과 홍보를
        한곳에서 하는 커뮤니티입니다.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7">
        <li>핸드리뷰는 그래픽 에디터와 Fold/Check/Call/Raise 원클릭 투표로 스팟을 나눕니다.</li>
        <li>
          매장후기는 매너·서비스·시설·분위기 별점과 종합 스탬프가 보이며, 닉네임은 익명입니다.
        </li>
        <li>인증 딜러는 닉네임 옆에 골드 뱃지가 붙고, 레벨 보상(라이브/헌터/에이스)이 함께 표시됩니다.</li>
        <li>고정 직원·지원 딜러·딜러 팀 구인과 검증 매장 공식 홍보(메인 6구좌), 관리자 전국 대회 일정을 운영합니다.</li>
      </ul>
    </article>
  );
}
