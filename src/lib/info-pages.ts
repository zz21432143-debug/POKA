import { LONG_GUIDES } from "@/lib/guide-articles-long";
import { LONG_GUIDES_2 } from "@/lib/guide-articles-long-2";
import { LONG_GUIDES_3 } from "@/lib/guide-articles-long-3";
import { LONG_GUIDES_4 } from "@/lib/guide-articles-long-4";
import { LONG_GUIDES_5 } from "@/lib/guide-articles-long-5";
import { LONG_GUIDES_6 } from "@/lib/guide-articles-long-6";
import { LONG_GUIDES_7 } from "@/lib/guide-articles-long-7";
import { LONG_GUIDES_8 } from "@/lib/guide-articles-long-8";
import { LONG_GUIDES_9 } from "@/lib/guide-articles-long-9";
import { LONG_GUIDES_10 } from "@/lib/guide-articles-long-10";
import { BASE_GUIDE_UPDATES } from "@/lib/guide-articles-base";
import { MORE_GUIDE_UPDATES } from "@/lib/guide-articles-more";
import { GUIDE_APPENDS, GUIDE_APPEND_UPDATED } from "@/lib/guide-articles-append";
import { GUIDE_APPENDS_2, GUIDE_APPEND_2_UPDATED } from "@/lib/guide-articles-append-2";
import { GUIDE_APPENDS_3, GUIDE_APPEND_3_UPDATED } from "@/lib/guide-articles-append-3";
import { GUIDE_APPENDS_4, GUIDE_APPEND_4_UPDATED } from "@/lib/guide-articles-append-4";
import { GUIDE_APPENDS_5, GUIDE_APPEND_5_UPDATED } from "@/lib/guide-articles-append-5";
import { GUIDE_APPENDS_6, GUIDE_APPEND_6_UPDATED } from "@/lib/guide-articles-append-6";

export type InfoArticle = {
  title: string;
  body: string;
};

export type GuideArticle = InfoArticle & {
  slug: string;
  summary: string;
  /** 최종 수정일 YYYY-MM-DD(없으면 GUIDE_UPDATED_DEFAULT) */
  updated?: string;
  /** 글 아래 관련 툴 바로가기 */
  tool?: { href: string; label: string };
};

const BASE_GUIDES: GuideArticle[] = [
  {
    slug: "holdem-dealer",
    title: "홀덤 딜러가 하는 일",
    summary: "텍사스 홀덤 테이블에서 딜러가 실제로 지키는 일.",
    body: `텍사스 홀덤은 각자 홀카드 2장과 공유 보드 5장으로 가장 높은 5장 조합을 만드는 게임입니다. 딜러의 일은 승부를 가르는 것이 아니라, 규칙대로 카드를 돌리고 액션을 받아 팟을 정확하게 정산하는 것입니다.

테이블에서는 항상 카드·칩·버튼 세 가지를 보호합니다. 애매하면 추측해서 진행하지 말고 플로어를 부릅니다. 콜은 짧고 크게, 같은 말을 두 번 해도 됩니다.`,
  },
  {
    slug: "seats-and-button",
    title: "홀덤 자리와 버튼",
    summary: "6맥스 자리 이름과 딜러 버튼 이동.",
    body: `6맥스 기준으로 자리는 보통 UTG → MP → CO → BTN → SB → BB 순입니다. 버튼(딜러 버튼)이 기준점입니다. 버튼이 한 칸씩 시계 방향으로 돌고, 그 왼쪽이 스몰블라인드, 그다음이 빅블라인드입니다.

딜러는 매 핸드 시작 전에 버튼 위치를 확인하고, 블라인드가 나왔는지 본 뒤에 카드를 돌립니다. 토너먼트에서 선수가 빠지면 데드 버튼·데드 스몰이 생길 수 있으니 하우스 룰을 따릅니다.`,
  },
  {
    slug: "blinds-antes",
    title: "홀덤 블라인드와 앤티",
    summary: "강제 뱃, 스트래들, 하우스 고지.",
    body: `모든 게임은 핸드를 열기 전에 강제 뱃이 나갑니다. 스몰블라인드는 보통 빅블라인드의 절반입니다. 앤티가 있는 레벨이면 살아 있는 선수 전원(또는 버튼 앤티 등 하우스 규정)이 먼저 냅니다.

스트래들이 허용된 테이블에서는 시작 전 한 번 고지합니다. 누가, 몇 배, 액션이 어디서부터인지가 분쟁의 핵심입니다. 딜러가 추측하지 말고 테이블에 합의된 룰을 말합니다.`,
  },
  {
    slug: "dealing-order",
    title: "홀덤 카드를 돌리는 순서",
    summary: "프리플랍부터 리버, 번 카드.",
    body: `버튼을 기준으로 왼쪽(스몰블라인드)부터 시계 방향으로 한 장씩, 두 바퀴를 돌립니다. 선수마다 홀카드 2장입니다. 본인 패만 보고 나머지는 닫아 둡니다.

스트리트는 네 단계입니다.
1) 프리플랍 — 홀카드만 있는 상태
2) 플랍 — 커뮤니티 카드 3장
3) 턴 — 4번째 보드
4) 리버 — 5번째 보드

번 카드(burn)는 플랍·턴·리버를 까기 전에 한 장씩 버립니다. 보드를 펼 때는 카드를 테이블 중앙에 가지런히, 모든 선수가 보이게 놓습니다.`,
  },
  {
    slug: "holdem-actions",
    title: "홀덤 액션 폴드 체크 콜 레이즈",
    summary: "구두 선언과 칩 라인, 스트링벳.",
    body: `폴드(Fold): 핸드를 포기하고 카드를 딜러에게 돌립니다.
체크(Check): 앞에 벳이 없을 때 패스합니다. 칩을 내지 않습니다.
콜(Call): 앞에 나온 금액과 맞춥니다.
벳(Bet): 그 스트리트 첫 자발 뱃입니다.
레이즈(Raise): 앞에 나온 뱃을 올립니다. 미니멈 레이즈는 직전 인상분과 같아야 합니다.
올인(All-in): 남은 스택 전부입니다.

딜러는 칩이 라인 안에 들어왔는지, 구두 선언이 있었는지를 함께 봅니다. 말로 레이즈를 선언했으면 그 금액이 우선인 하우스가 많습니다.
스트링 벳(칩을 두 번에 나눠 냄)은 경고 후 첫 동작만 인정하는 곳이 많습니다.
언더콜은 완성한 콜로 볼지, 부족한 금액만 더 받을지 하우스 룰을 따릅니다.`,
  },
  {
    slug: "action-order",
    title: "홀덤에서 누가 먼저 액션하나",
    summary: "프리플랍 UTG, 이후 스트리트는 버튼 왼쪽.",
    body: `프리플랍은 빅블라인드 왼쪽(UTG)부터입니다. 플랍·턴·리버는 버튼 왼쪽, 아직 살아 있는 첫 선수부터입니다.

한 선수가 액션을 마치면 시계 방향으로 다음 생존자에게 넘어갑니다. 해당 스트리트의 마지막 레이즈(또는 벳)가 전원에게 콜·폴드되면 스트리트가 끝납니다. 모두 체크면 보드를 깝니다.

스킵하면 안 됩니다. 순서를 건너뛰었으면 즉시 멈추고 바로잡습니다.`,
  },
  {
    slug: "hand-rankings",
    title: "홀덤 핸드 순위",
    summary: "로열 플러시부터 하이카드까지.",
    body: `1. 로열 플러시 — 같은 무늬 A-K-Q-J-10
2. 스트레이트 플러시 — 같은 무늬 연속 5장
3. 포카드 — 같은 랭크 4장
4. 풀하우스 — 쓰리 + 페어
5. 플러시 — 같은 무늬 5장
6. 스트레이트 — 무늬가 달라도 연속 5장 (A-2-3-4-5가 가장 낮고, 10-J-Q-K-A가 가장 높음)
7. 쓰리 오브 어 카인드
8. 투페어
9. 원페어
10. 하이카드

홀덤은 홀카드 2장 + 보드 5장 중 가장 강한 5장을 씁니다. 보드만으로 같은 핸드면 스플릿입니다. 핸드 읽기가 애매하면 플로어를 부릅니다.`,
  },
  {
    slug: "showdown",
    title: "홀덤 쇼다운 순서",
    summary: "마지막 공격자 오픈, 올인 쇼다운.",
    body: `리버 액션이 끝나면 마지막 공격자(벳 또는 레이즈한 선수)가 먼저 패를 엽니다. 체크만 있었으면 버튼 왼쪽 생존자부터 여는 하우스가 흔합니다. 하우스 룰을 따릅니다.

이미 이긴 것이 확실한 패가 열렸으면, 뒤 선수는 카드를 안 열고 muck할 수 있습니다. 다만 올인 쇼다운은 보통 관련 패를 모두 엽니다.

딜러는 “쇼다운입니다. 마지막 벳부터 열어 주세요.”처럼 멘트를 먼저 하고, 슬로우롤이 나오지 않게 진행합니다.`,
  },
  {
    slug: "side-pots",
    title: "홀덤 메인팟과 사이드팟",
    summary: "올인 이후 팟을 나누는 순서.",
    body: `올인이 나오면 그 선수가 넣을 수 있는 금액까지만 메인팟에 들어갑니다. 스택이 더 큰 선수들끼리의 차액은 사이드팟입니다.

정산 순서: 가장 작은 올인부터 팟을 나누고, 핸드를 비교해 각 팟의 승자에게 줍니다. 칩을 세로로 구분하거나 별도 존에 두면 실수가 줄어듭니다.

사이드팟이 꼬이면 혼자 암산하지 말고 플로어와 함께 칩을 세세요.`,
  },
  {
    slug: "new-dealer-checklist",
    title: "홀덤 딜러 되는 법 · 첫 주 체크리스트",
    summary: "신입 딜러가 첫 주에 외울 순서와 토너먼트 진행 절차.",
    body: `토너먼트는 레벨마다 블라인드가 올라가고, 브레이크·컬러업·버블 절차가 있습니다. 매장마다 하우스 룰이 다르니 첫 출근 날 플로어에게 꼭 확인하세요.

토너에서 레벨이 끝나기 직전이면 시계를 보고 “이번 핸드까지”를 명확히 말합니다. 컬러업은 합 → 교환 → 재확인 순입니다. 어떤 테이블이든 룰이 충돌하면 딜러의 추측보다 플로어 판정이 우선입니다.

첫 주에 외울 것
1. 버튼·블라인드 확인 후 딜
2. 프리플랍은 UTG부터, 이후 스트리트는 버튼 왼쪽부터
3. 벳·레이즈 금액을 소리 내 반복
4. 올인이면 금액과 사이드팟을 분리
5. 보드를 까기 전 번 카드
6. 쇼다운 멘트 후 오픈
7. 애매하면 플로어

핸드리뷰 게시판에 스팟을 남기면 실전 감각이 빨리 붙습니다. 자리 약어(UTG, CO, BTN, SB, BB)와 스트리트만 적어도 충분합니다.`,
  },
  {
    slug: "dealer-pay",
    title: "홀덤 딜러 시급 · 급여 구조 정리 (지원 · 급구 · 대회 · 고정)",
    summary: "공고마다 다른 급여 방식, 3.3%와 4대보험 차이, 실수령액 확인법.",
    tool: { href: "/tools/pay", label: "딜러 급여 계산기로 실수령액 계산하기" },
    body: `홀덤 딜러 급여는 일하는 방식에 따라 크게 네 가지로 나뉩니다.

▶ 지원 딜러 · 급구(대타)
• 보통 시급제이고, 하루 단위로 일합니다.
• "6시간 보장"처럼 보장 시간이 있으면 일찍 끝나도 그 시간만큼 받습니다.
• 급구는 당일·다음 날 근무가 많아 조건이 조금 더 좋은 경우가 있습니다.

▶ 대회 딜러
• 대회 기간(1~5일) 동안 일하는 시급·일급제입니다.
• 지방 대회는 숙소·차비를 따로 주는지 꼭 확인하세요.

▶ 고정 직원
• 월급제가 많고, 근무 요일·시간이 정해져 있습니다.

▶ 공제 방식 확인
• 3.3% 공제: 소득세 3% + 지방소득세 0.3%가 빠집니다. 프리랜서(사업소득)로 받는 방식입니다.
• 4대보험: 국민연금·건강보험·장기요양·고용보험 근로자 부담분이 빠집니다. 더 많이 빠지지만 실업급여 등 혜택이 있습니다.

▶ 공고 볼 때 체크
1. 시급·일급·월급 중 무엇인지
2. 보장 시간과 연장 시급
3. 3.3% 공제인지, 4대보험인지
4. 차비·식사·숙소 제공 여부
5. 지급일(당일 · 주급 · 월급)`,
  },
  {
    slug: "dealer-dress-code",
    title: "홀덤 딜러 복장 · 출근 준비물",
    summary: "첫 출근 전에 챙길 복장과 준비물, 매장에서 지키는 기본 매너.",
    body: `매장마다 규정이 다르지만, 대부분 아래 기준이면 무난합니다.

▶ 복장
• 상의: 검은색 셔츠 또는 블라우스(로고·무늬 없는 것)
• 하의: 검은색 슬랙스
• 신발: 오래 서 있어도 편한 검은색 구두·단화
• 소매가 넓거나 장신구가 큰 옷은 피합니다(카드·칩을 건드릴 수 있음).

▶ 준비물
• 손톱은 짧게, 손 보습제(카드가 손에 붙지 않게 너무 많이 바르지 않기)
• 머리가 길면 묶을 고무줄
• 신분증(대회·호텔 행사는 출입 확인을 하기도 함)

▶ 테이블 매너
• 카드와 칩은 항상 테이블 위, 손은 테이블 밖으로 내리지 않습니다.
• 플레이어 핸드에 대한 의견은 말하지 않습니다.
• 애매한 상황은 직접 판정하지 말고 플로어를 부릅니다.

공고에 드레스코드가 적혀 있으면 그 기준이 우선입니다.`,
  },
  {
    slug: "tournament-structure",
    title: "토너먼트 블라인드 구조표 만드는 법 (예시 포함)",
    summary: "시작 칩, 레벨 시간, 블라인드 올리는 폭, 브레이크 넣는 법.",
    tool: { href: "/tools/board", label: "게임 현황판에서 블라인드 구조 바로 만들기" },
    body: `블라인드 구조는 대회 길이와 분위기를 결정합니다.

▶ 기본 순서
1. 시작 칩을 정합니다. 예) 30,000
2. 시작 BB를 시작 칩의 1/100~1/150 정도로 잡습니다. 예) BB 200~300
3. 레벨 시간을 정합니다. 짧은 대회 15분, 보통 20분, 긴 대회 30분 이상
4. 블라인드는 레벨마다 약 20~50%씩 올립니다.
5. 3~4레벨마다 10분 브레이크를 넣습니다.

▶ 예시 (시작 칩 30,000 · 20분)
레벨 1: 100 / 200 (BB 앤티 200)
레벨 2: 100 / 300
레벨 3: 200 / 400
레벨 4: 300 / 500
— 브레이크 10분 —
레벨 5: 300 / 600
레벨 6: 400 / 800
레벨 7: 500 / 1,000
레벨 8: 600 / 1,200

▶ 레지 마감
보통 레벨 6~10 끝(브레이크 전)까지 등록을 받습니다. 마감 뒤 브레이크에 애드온을 하는 경우가 많습니다.

▶ BB 앤티
앤티를 BB 자리에서 테이블 전체 몫으로 한 번에 받는 방식으로, 진행이 빨라 요즘 많이 씁니다. 보통 BB와 같은 금액입니다.`,
  },
  {
    slug: "tournament-terms",
    title: "레지 마감 · 리바인 · 얼리칩 · 애드온 뜻 (토너먼트 용어)",
    summary: "대회 공지에 자주 나오는 용어와 평균 스택 계산법.",
    body: `▶ 레지 마감(레이트 레지스트레이션)
대회가 시작된 뒤에도 정해진 레벨까지는 등록할 수 있습니다. "레벨 8 마감"이면 레벨 8이 끝날 때까지(뒤에 붙은 브레이크 포함인 경우가 많음) 등록할 수 있습니다.

▶ 리바인 · 리엔트리
탈락하거나 칩이 일정 이하일 때 다시 등록해 칩을 받는 것입니다. 횟수 제한이 있는지 확인하세요.

▶ 얼리칩
시작 시간 전에 미리 등록하거나 착석한 사람에게 주는 추가 칩입니다.

▶ 애드온
정해진 시점(보통 레지 마감 브레이크)에 칩을 추가로 받는 것입니다.

▶ 평균 스택
토탈 칩 ÷ 남은 인원
토탈 칩 = 바인 수 × 시작 칩 + 리바인 수 × 리바인 칩 + 얼리 수 × 얼리칩 + 애드온 수 × 애드온 칩

▶ ITM · 버블
입상권에 들어가는 것을 ITM이라 하고, 입상 바로 직전 순위에서 한 명이 탈락하기 전 구간을 버블이라고 합니다. 버블에서는 핸드 포 핸드로 진행하기도 합니다.`,
  },
  {
    slug: "color-up",
    title: "컬러업(칩 교환) 하는 법",
    summary: "작은 단위 칩을 빼는 시점과 레이스 오프 순서.",
    body: `블라인드가 올라가면 가장 작은 단위 칩이 더 이상 필요 없어집니다. 이때 작은 칩을 큰 칩으로 바꾸는 것이 컬러업입니다.

▶ 언제
보통 브레이크 때 합니다. 공지된 레벨 이후로 그 칩이 쓰이지 않을 때입니다.

▶ 순서
1. 각 플레이어의 작은 칩을 모아 플레이어 앞에 그대로 보이게 둡니다.
2. 큰 칩 단위로 바꿀 수 있는 만큼 바꿔 줍니다.
3. 남는 칩(큰 칩 1개가 안 되는 양)은 레이스 오프로 정리합니다.
4. 레이스 오프: 남은 칩 1개당 카드 1장을 앞면으로 나눠 주고, 가장 높은 카드부터 큰 칩을 받습니다.
5. 한 사람은 레이스 오프로 탈락하지 않습니다(최소 1칩 보장 규정이 일반적).

▶ 팁
• 컬러업 전에 테이블 전체에 "지금 컬러업합니다"라고 알립니다.
• 칩을 세는 동안 플레이어가 칩을 만지지 않게 합니다.
• 애매하면 플로어를 부르세요.`,
  },
  {
    slug: "dealer-rotation-guide",
    title: "딜러 로테이션 짜는 법 (교대 간격 · 휴식 · 컨바인)",
    summary: "딜러 수와 테이블 수로 교대표 짜는 원리, 퇴근·컨바인 대처.",
    tool: { href: "/tools/rotation", label: "딜러 로테이션으로 교대표 자동으로 짜기" },
    body: `▶ 기본 원리
• 딜러 수 − 테이블 수 = 동시에 쉬는 인원
• 예) 테이블 6개 · 딜러 8명 → 한 번에 2명이 쉽니다.
• 교대 간격 20분이면 한 딜러는 보통 60분 딜 → 20분 휴식 흐름이 됩니다.

▶ 최대 연속 딜
한 사람이 너무 오래 서 있지 않게 "최대 연속 딜 80분"처럼 기준을 정합니다. 쉬는 순서는 가장 오래 일한 딜러부터 돌립니다.

▶ 퇴근 · 컨바인
• 퇴근: 그 딜러 자리를 쉬던 딜러가 채웁니다.
• 컨바인(테이블 줄이기): 빠지는 테이블 딜러가 휴식 줄로 들어갑니다.
• 이때 손으로 짠 표는 전부 다시 맞춰야 해서 실수가 많이 납니다.

▶ 공유
교대표를 이미지나 단톡방 글로 올리고, 대기실 TV에 띄워 두면 "다음에 어디 들어가요?" 질문이 줄어듭니다.`,
  },
  {
    slug: "seat-draw-guide",
    title: "싯드로우 · 테이블 밸런싱 하는 법",
    summary: "다음 날 진출자 좌석 배정과 테이블 인원 맞추기.",
    tool: { href: "/tools/seat-draw", label: "싯드로우로 칩 균등 좌석 배정하기" },
    body: `▶ 싯드로우(좌석 배정)
DAY 2·파이널처럼 여러 날 진행하는 대회는 다음 날 좌석을 새로 정합니다.
• 무작위가 원칙입니다.
• 큰 스택이 한 테이블에 몰리지 않게 테이블마다 칩 합계를 비슷하게 맞추는 경우가 많습니다.
• 결과는 이름 · 테이블 · 자리 번호로 공지합니다.

▶ 테이블 밸런싱(대회 중)
• 테이블 인원 차이가 2명 이상 나면 많은 테이블에서 적은 테이블로 한 명을 옮깁니다.
• 옮길 사람은 보통 빅블라인드가 될 차례인 사람(또는 하우스 규정)입니다.
• 테이블 수를 줄일 때(브레이크)는 빠지는 테이블 인원을 다른 테이블 빈자리에 무작위로 넣습니다.

정확한 기준은 대회 규정과 플로어 판정을 따릅니다.`,
  },
  {
    slug: "urgent-shift-tips",
    title: "홀덤 딜러 급구 · 대타 빨리 잡는 법",
    summary: "급구 공고를 먼저 보는 방법과 지원할 때 남길 말.",
    tool: { href: "/boards/jobs/urgent", label: "지금 올라온 급구 · 대타 보기" },
    body: `급구는 먼저 연락한 사람이 잡는 경우가 대부분입니다.

▶ 먼저 보는 법
1. POKA 앱을 설치합니다(카톡에서 링크를 열면 「다른 브라우저로 열기」).
2. 앱을 열고 급구 알림에서 내 지역(또는 전국)을 고른 뒤 알림을 켭니다.
3. 급구가 올라오면 휴대폰으로 바로 알림이 옵니다.

▶ 지원할 때
• 이름(닉네임), 경력(예: 지원 딜러 1년), 가능한 시간을 짧게 남깁니다.
• 대회 딜러 경험이나 TDA 룰을 알고 있으면 함께 적습니다.
• 확정되면 근무 시간 · 장소 · 급여 · 복장을 한 번 더 확인합니다.

▶ 매장에서 급구를 올릴 때
• 날짜 · 시간 · 시급 · 인원 · 연락처를 빠짐없이 적으면 지원이 빨리 옵니다.
• 급구로 올리면 그 지역 알림을 켠 딜러에게 바로 알림이 갑니다.`,
  },
];

/** 가이드 최종 수정일 기본값(글마다 updated로 덮어씀) */
export const GUIDE_UPDATED_DEFAULT = "2026-10-16";

/** 짧은 기본 가이드 + 딜러 실무 긴 글 */
// 기본 9편은 보강판(실전 예시 · 계산 · 질문)으로 덮어씀
const BASE_GUIDES_FULL = BASE_GUIDES.map((row) => ({ ...row, ...(BASE_GUIDE_UPDATES[row.slug] ?? {}) }));

// 짧았던 글 보강판(2차)도 같은 slug에 덮어씀
export const GUIDE_ARTICLES: GuideArticle[] = [...BASE_GUIDES_FULL, ...LONG_GUIDES, ...LONG_GUIDES_2, ...LONG_GUIDES_3, ...LONG_GUIDES_4, ...LONG_GUIDES_5, ...LONG_GUIDES_6, ...LONG_GUIDES_7, ...LONG_GUIDES_8, ...LONG_GUIDES_9, ...LONG_GUIDES_10].map((row) => {
  const full = { ...row, ...(MORE_GUIDE_UPDATES[row.slug] ?? {}) };
  // 3차: 본문 끝에 예시 · 실수 · 질문 덧붙임
  const extra = GUIDE_APPENDS[row.slug];
  const withExtra = extra ? { ...full, body: `${full.body}

${extra}`, updated: GUIDE_APPEND_UPDATED } : full;
  // 핵심 글 2차 덧붙임(공백 포함 2,000자 이상)
  const extra2 = GUIDE_APPENDS_2[row.slug];
  const withExtra2 = extra2 ? { ...withExtra, body: `${withExtra.body}

${extra2}`, updated: GUIDE_APPEND_2_UPDATED } : withExtra;
  // 3차 덧붙임(짧은 글 1,500자 이상으로)
  const extra3 = GUIDE_APPENDS_3[row.slug];
  const withExtra3 = extra3 ? { ...withExtra2, body: `${withExtra2.body}

${extra3}`, updated: GUIDE_APPEND_3_UPDATED } : withExtra2;
  // 4차 덧붙임
  const extra4 = GUIDE_APPENDS_4[row.slug];
  const withExtra4 = extra4 ? { ...withExtra3, body: `${withExtra3.body}

${extra4}`, updated: GUIDE_APPEND_4_UPDATED } : withExtra3;
  // 5차 덧붙임
  const extra5 = GUIDE_APPENDS_5[row.slug];
  const withExtra5 = extra5 ? { ...withExtra4, body: `${withExtra4.body}

${extra5}`, updated: GUIDE_APPEND_5_UPDATED } : withExtra4;
  // 6차 덧붙임
  const extra6 = GUIDE_APPENDS_6[row.slug];
  return extra6 ? { ...withExtra5, body: `${withExtra5.body}

${extra6}`, updated: GUIDE_APPEND_6_UPDATED } : withExtra5;
});

export function getGuideArticle(slug: string) {
  return GUIDE_ARTICLES.find((row) => row.slug === slug) ?? null;
}
