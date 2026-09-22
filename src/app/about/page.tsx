export default function AboutPage() {
  return (
    <article className="prose-legal mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">사이트 소개</h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        POKA는 포커 플레이어와 딜러가 대회 일정을 보고, 공식 홍보를 나누며, 커뮤니티와 구인·구직을
        한곳에서 하는 사이트입니다.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7">
        <li>🗓️ 대회 일정 — 일자별·월별 주요 토너먼트 일정표 (관리자 등록)</li>
        <li>📢 공식 홍보 — 팀·브랜드 공식 홍보, 제휴 및 협찬 소식</li>
        <li>
          💬 커뮤니티 — 출석체크, 이게 맞나요?, 현장 스케치, 자유게시판, 핸드리뷰(원클릭 투표),
          익명 게시판
        </li>
        <li>💼 구인 / 구직 — 고정 직원, 지원 딜러, 팀 구인, 급구/대타, 개인 구직</li>
        <li>인증 딜러는 닉네임 옆에 골드 뱃지가 붙고, 레벨 보상(라이브/헌터/에이스)이 함께 표시됩니다.</li>
      </ul>
    </article>
  );
}
