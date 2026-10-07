export default function AboutPage() {
  return (
    <article className="prose-legal mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">사이트 소개</h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        POKA(pokerwiki.co.kr)는 홀덤 플레이어와 홀덤 딜러를 위한 커뮤니티입니다. 핸드리뷰, 홀덤펍 구인, 대회 일정,
        후기를 한곳에 모읍니다.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7">
        <li>오늘의 핸드 — 홈에서 바로 투표합니다.</li>
        <li>이번 주 홀덤 대회 — 매주 월요일(KST) 주간 허브가 생깁니다.</li>
        <li>구인 — 제목에 지역과 홀덤펍이 들어갑니다.</li>
        <li>익명 게시판 — 닉네임은 숨기지만 작성 책임은 본인에게 있습니다.</li>
        <li>인증 딜러 — 닉네임 옆 골드 뱃지로 표시됩니다.</li>
        <li>공식 오픈채팅은 홈·헤더·우측 노란 버튼에서 들어갑니다.</li>
      </ul>
    </article>
  );
}
