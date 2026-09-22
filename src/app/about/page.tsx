export default function AboutPage() {
  return (
    <article className="prose-legal mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">사이트 소개</h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        POKA는 포커 플레이어와 딜러가 핸드를 나누고, 매장을 후기하며, 구인과 홍보를
        한곳에서 하는 커뮤니티입니다.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7">
        <li>핸드리뷰 그래픽 에디터로 스팟을 공유합니다.</li>
        <li>매장후기는 화면에 익명으로 보이며, 운영자는 신고 시 내부 기록을 확인합니다.</li>
        <li>고정 직원·지원 딜러·딜러 팀 구인과 프리미엄 홍보 6구좌를 운영합니다.</li>
      </ul>
    </article>
  );
}
