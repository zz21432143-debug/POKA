import type { BoardType } from "@/generated/prisma/enums";
import type { HandReviewData } from "@/lib/hand-review";
import { prizeToWon } from "@/lib/prize";

/**
 * 1주일 콘텐츠 발행 계획(하루 2개, 14개). 관리자 「콘텐츠 발행」 화면에서 POKA 계정으로 올립니다.
 * - 〔 〕가 남아 있는 글은 실제 내용(사진·결과)을 채워야 올릴 수 있습니다.
 * - schedule: 대회 캘린더에 등록된 실제 일정으로 본문을 만듭니다.
 */
export type PlanItem = {
  id: string;
  day: string;
  time: string;
  kind: "초보" | "핸드분석" | "정보";
  boardType: BoardType;
  boardLabel: string;
  title: string;
  content: string;
  hand?: HandReviewData;
  /** 대회 캘린더로 본문을 채우는 글 */
  schedule?: "week" | "weekend";
  /** 사진을 붙이는 글(현장 스케치) */
  photos?: boolean;
  /** 직접 핸드를 그려야 하는 글(실제 대회 핸드) */
  manualHand?: boolean;
};

export const PLACEHOLDER = "〔";

const seats = (rows: Array<[string, number, boolean?, string[]?]>) =>
  rows.map(([id, stackBb, isHero, cards]) => ({
    id: id as HandReviewData["seats"][number]["id"],
    stackBb,
    sitting: true,
    isHero: Boolean(isHero),
    cards: cards ?? [],
    showCards: Boolean(isHero),
  }));

const BLINDS: HandReviewData["blinds"] = [
  { actor: "SB", action: "bet", amount: 0.5 },
  { actor: "BB", action: "bet", amount: 1 },
];

/** 화: BTN A♥J♥ vs BB 3벳팟, 리버 올인 */
const HAND_AJ: HandReviewData = {
  heroPosition: "BTN",
  villainPosition: "BB",
  heroCards: ["Ah", "Jh"],
  villainCards: [],
  board: ["Ac", "8d", "4s", "9h", "3c"],
  effectiveBb: 100,
  potBb: 36.5,
  winnerSeat: null,
  streetPots: { preflop: 22.5, flop: 36.5, turn: 36.5, river: 36.5 },
  seats: seats([["BTN", 100, true, ["Ah", "Jh"]], ["SB", 100], ["BB", 100]]),
  blinds: BLINDS,
  streets: {
    preflop: [
      { actor: "BTN", action: "raise", amount: 2.5 },
      { actor: "SB", action: "fold" },
      { actor: "BB", action: "raise", amount: 11 },
      { actor: "BTN", action: "call", amount: 8.5 },
    ],
    flop: [
      { actor: "BB", action: "bet", amount: 7 },
      { actor: "BTN", action: "call", amount: 7 },
    ],
    turn: [
      { actor: "BB", action: "check" },
      { actor: "BTN", action: "check" },
    ],
    river: [{ actor: "BB", action: "allin", amount: 82 }],
  },
};

/** 수: CO 7♠7♣, 플랍 7♥8♥2♠ 체크레이즈 올인 */
const HAND_SET: HandReviewData = {
  heroPosition: "CO",
  villainPosition: "BB",
  heroCards: ["7s", "7c"],
  villainCards: [],
  board: ["7h", "8h", "2s"],
  effectiveBb: 100,
  potBb: 5.5,
  winnerSeat: null,
  streetPots: { preflop: 5.5, flop: 5.5 },
  seats: seats([["CO", 100, true, ["7s", "7c"]], ["BTN", 100], ["SB", 100], ["BB", 100]]),
  blinds: BLINDS,
  streets: {
    preflop: [
      { actor: "CO", action: "raise", amount: 2.5 },
      { actor: "BTN", action: "fold" },
      { actor: "SB", action: "fold" },
      { actor: "BB", action: "call", amount: 1.5 },
    ],
    flop: [
      { actor: "BB", action: "check" },
      { actor: "CO", action: "bet", amount: 3 },
      { actor: "BB", action: "allin", amount: 97.5 },
    ],
    turn: [],
    river: [],
  },
};

/** 목: 버블 10bb BTN A♦7♣ */
const HAND_BUBBLE: HandReviewData = {
  heroPosition: "BTN",
  villainPosition: "BB",
  heroCards: ["Ad", "7c"],
  villainCards: [],
  board: [],
  effectiveBb: 10,
  potBb: 1.5,
  winnerSeat: null,
  streetPots: { preflop: 1.5 },
  seats: seats([["UTG", 30], ["MP", 22], ["CO", 35], ["BTN", 10, true, ["Ad", "7c"]], ["SB", 25], ["BB", 60]]),
  blinds: BLINDS,
  streets: {
    preflop: [
      { actor: "UTG", action: "fold" },
      { actor: "MP", action: "fold" },
      { actor: "CO", action: "fold" },
    ],
    flop: [],
    turn: [],
    river: [],
  },
};

export const CONTENT_PLAN: PlanItem[] = [
  {
    id: "mon-1",
    day: "월",
    time: "12:00",
    kind: "정보",
    boardType: "NOTICE",
    boardLabel: "공지사항",
    title: "이번 주 전국 홀덤 대회 일정 총정리 (상금 순)",
    schedule: "week",
    content: "",
  },
  {
    id: "mon-2",
    day: "월",
    time: "21:00",
    kind: "초보",
    boardType: "RULE_QA",
    boardLabel: "질문(룰 Q&A)",
    title: "홀덤 처음이면 이것만: 핸드 랭킹 10개 3분 정리",
    content: `홀덤은 내 카드 2장과 바닥 카드 5장 중 가장 좋은 5장으로 승부합니다.
위에 있을수록 강한 패입니다.

1. 로열 플러시 — 같은 무늬 A-K-Q-J-10
2. 스트레이트 플러시 — 같은 무늬로 숫자 5장 연속 (예: 9-8-7-6-5 ♥)
3. 포카드 — 같은 숫자 4장
4. 풀하우스 — 같은 숫자 3장 + 같은 숫자 2장
5. 플러시 — 같은 무늬 5장 (숫자 상관없음)
6. 스트레이트 — 숫자 5장 연속 (무늬 상관없음)
7. 트리플 — 같은 숫자 3장
8. 투페어 — 같은 숫자 2장씩 두 쌍
9. 원페어 — 같은 숫자 2장
10. 하이카드 — 아무것도 없을 때 가장 높은 카드

▶ 초보가 많이 헷갈리는 3가지
• 플러시가 스트레이트보다 강합니다. 반대로 외우는 분이 많아요.
• A는 가장 높은 카드지만, A-2-3-4-5 스트레이트에서는 1로 씁니다.
• 같은 족보끼리는 숫자가 높은 쪽이 이기고, 그래도 같으면 나머지 카드(키커)로 비교합니다.

헷갈리는 상황이 있으면 댓글로 물어보세요. 딜러분들이 답해 드립니다.`,
  },
  {
    id: "tue-1",
    day: "화",
    time: "12:00",
    kind: "초보",
    boardType: "FREE",
    boardLabel: "자유게시판",
    title: "포지션이 뭐길래? BTN·SB·BB 쉽게 이해하기",
    content: `홀덤 고수들이 "포지션이 반이다"라고 말하는 이유를 정리했습니다.

▶ 포지션 = 내가 몇 번째로 행동하는가
• BTN (버튼): 딜러 버튼 자리. 플랍부터는 항상 마지막에 행동해서 가장 유리합니다.
• SB (스몰 블라인드): 버튼 왼쪽. 블라인드 절반을 미리 내고, 플랍부터는 가장 먼저 행동해서 불리합니다.
• BB (빅 블라인드): SB 왼쪽. 블라인드 전액을 미리 내고, 프리플랍에서는 마지막에 행동합니다.
• UTG (언더 더 건): BB 바로 왼쪽. 프리플랍에서 가장 먼저 행동합니다.

▶ 마지막에 행동하면 왜 유리할까?
• 상대가 체크하는지 베팅하는지 보고 나서 결정할 수 있습니다.
• 팟 크기를 내가 조절하기 쉽습니다.
• 블러프도, 공짜 카드 받기도 쉬워집니다.

▶ 초보 실전 팁
• 앞자리(UTG 근처)에서는 강한 핸드만 플레이하세요.
• 버튼에 가까울수록 참여하는 핸드 범위를 조금씩 넓혀도 됩니다.

여러분은 어느 자리에서 제일 많이 잃으세요? 댓글로 알려 주세요 😂`,
  },
  {
    id: "tue-2",
    day: "화",
    time: "21:00",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "BTN vs BB AJs 3벳팟, 리버 올인에 콜할까?",
    hand: HAND_AJ,
    content: `[캐시 · 100bb]
• 히어로 BTN A♥J♥ 2.5bb 오픈 → BB 11bb 3벳 → 히어로 콜 (팟 22.5bb)
• 플랍 A♣ 8♦ 4♠: BB 7bb 베팅 → 히어로 콜 (팟 36.5bb)
• 턴 9♥: 체크, 체크
• 리버 3♣: BB 82bb 올인 (팟의 약 2.2배)

▶ 고민 포인트
• 탑페어 J키커지만, 3벳팟에서 AK·AQ에는 집니다.
• 턴에서 BB가 체크한 게 약해 보이기도 합니다.
• 리버 큰 오버벳은 아주 강하거나 완전 블러프인 경우가 많습니다.

콜 / 폴드, 여러분의 선택은?
투표하고 이유를 댓글로 남겨 주세요. 정답과 해설은 일요일에 공개합니다.`,
  },
  {
    id: "wed-1",
    day: "수",
    time: "12:00",
    kind: "정보",
    boardType: "TDA",
    boardLabel: "TDA 룰",
    title: "올인 후 사이드팟 계산, TDA 룰로 정리",
    content: `여러 명이 올인하면 팟이 나뉩니다. 계산법만 알면 어렵지 않습니다.

▶ 예시: 3명 올인
• A: 20,000 올인
• B: 50,000 올인
• C: 100,000 (A·B 모두 콜)

① 메인팟 — 가장 작은 스택 기준
20,000 × 3명 = 60,000
A·B·C 모두 가져갈 수 있습니다.

② 사이드팟
(50,000 − 20,000) × 2명 = 60,000
B·C만 가져갈 수 있습니다. A는 이 팟에 낸 칩이 없으니까요.

③ 남는 칩
C가 더 낸 50,000은 받아 줄 사람이 없으므로 C에게 그대로 돌려줍니다.

▶ 정리 순서
1. 가장 작은 올인 금액으로 메인팟을 만듭니다.
2. 남은 사람끼리 다음으로 작은 금액으로 사이드팟을 만듭니다.
3. 반복합니다.
4. 각 팟은 그 팟에 참여한 사람 중 가장 좋은 패가 가져갑니다.

Q. A가 제일 좋은 패면 다 가져가나요?
A. 아닙니다. A는 메인팟(60,000)만 가져가고, 사이드팟은 B·C 중 더 좋은 패가 가져갑니다.

대회에서 헷갈렸던 팟 계산이 있으면 댓글로 남겨 주세요. 딜러분들이 정리해 드립니다.`,
  },
  {
    id: "wed-2",
    day: "수",
    time: "21:00",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "탑셋인데 젖은 보드, 플랍 체크레이즈 올인 받을까?",
    hand: HAND_SET,
    content: `[캐시 · 100bb]
• 히어로 CO 7♠7♣ 2.5bb 오픈 → BB 콜 (팟 5.5bb)
• 플랍 7♥ 8♥ 2♠: BB 체크 → 히어로 3bb 베팅 → BB 체크레이즈 올인 (약 97bb)

▶ 고민 포인트
• 탑셋입니다. 그런데 하트 2장에 8-7이 깔린 젖은 보드입니다.
• 상대가 9♥T♥ 같은 콤보 드로우면 생각보다 많이 따라옵니다.
• 상대가 88 탑셋이면 크게 집니다.

콜 / 폴드, 여러분의 선택은?
상대가 어떤 핸드로 이렇게 할 것 같은지도 댓글로 적어 주세요. 해설은 일요일에 공개합니다.`,
  },
  {
    id: "thu-1",
    day: "목",
    time: "12:00",
    kind: "초보",
    boardType: "RULE_QA",
    boardLabel: "질문(룰 Q&A)",
    title: "첫 대회 나가기 전 체크리스트 (바이인·리엔트리·블라인드)",
    content: `첫 대회 전에 이것만 확인하면 당황할 일이 없습니다.

▶ 등록 전
✅ 바이인 — 참가비가 얼마인지
✅ 리엔트리 — 탈락 후 다시 들어올 수 있는지, 몇 번까지인지
✅ 애드온 — 정해진 시점에 칩을 추가로 살 수 있는지
✅ 레이트 등록 — 몇 레벨(몇 시)까지 늦게 들어갈 수 있는지
✅ 신분증 — 대회에 따라 필요합니다

▶ 구조 확인
✅ 스타팅 스택 — 처음 받는 칩 수
✅ 블라인드 구조 — 레벨당 몇 분인지, 얼마씩 오르는지
✅ 브레이크 — 쉬는 시간이 언제인지

▶ 테이블에서
✅ 자리 배정표대로 앉기
✅ 핸드 중에는 휴대폰을 테이블 위에서 쓰지 않기
✅ 큰 칩은 다른 사람이 보이게 앞쪽에 두기
✅ 모르는 게 있으면 딜러를 부르세요. 아무도 뭐라 하지 않습니다.

▶ 초보 팁
• 레이트 등록으로 들어가면 블라인드가 이미 높습니다. 시간을 아끼는 대신 칩 여유가 적다는 점을 기억하세요.
• 첫 대회는 순위보다 구조와 분위기 익히기를 목표로 잡으세요.

첫 대회 때 가장 당황했던 순간은 언제였나요? 댓글로 남겨 주세요.`,
  },
  {
    id: "thu-2",
    day: "목",
    time: "21:00",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "버블 직전 10bb A7o, 푸시 vs 폴드",
    hand: HAND_BUBBLE,
    content: `[토너먼트 · 상금권 직전 버블]
• 남은 인원 19명, 18위부터 상금
• 히어로 BTN A♦7♣, 10bb
• 앞에서 모두 폴드
• SB 25bb / BB 칩리더 60bb

▶ 고민 포인트
• 한 명만 더 떨어지면 상금권입니다.
• BB가 칩리더라서 넓게 콜할 수 있습니다.
• 그런데 폴드하면 블라인드가 돌아와서 더 짧아집니다.

올인(푸시) / 폴드, 여러분의 선택은?
투표하고 이유도 남겨 주세요. 일요일에 해설합니다.`,
  },
  {
    id: "fri-1",
    day: "금",
    time: "12:00",
    kind: "정보",
    boardType: "NOTICE",
    boardLabel: "공지사항",
    title: "이번 주말 홀덤 대회 모아보기 (상금·장소 비교)",
    schedule: "weekend",
    content: "",
  },
  {
    id: "fri-2",
    day: "금",
    time: "21:00",
    kind: "초보",
    boardType: "FREE",
    boardLabel: "자유게시판",
    title: "딜러가 알려주는 테이블 매너 7가지",
    content: `딜러들이 "이것만 지켜 주면 좋겠다"고 꼽은 매너입니다.

1. 스트링벳 금지
칩은 한 번에 내세요. 콜하는 척하다 칩을 더 얹으면 레이즈로 인정되지 않을 수 있습니다. 레이즈는 먼저 "레이즈"라고 말하는 게 가장 확실합니다.

2. 내 차례에만 행동
차례가 오기 전에 폴드나 베팅을 하면(아웃 오브 턴) 다른 사람의 판단에 영향을 줍니다.

3. 카드 보호하기
카드 위에 칩이나 프로텍터를 올려 두세요. 보호하지 않은 카드는 실수로 걷혀도 돌려받기 어렵습니다.

4. 슬로우롤 금지
이긴 걸 알면서 일부러 늦게 카드를 까는 건 대표적인 비매너입니다.

5. 진행 중인 핸드에 훈수 금지
폴드한 사람도 진행 중인 핸드에 대해 말하면 안 됩니다. "저거 플러시 아니야?"도 안 됩니다.

6. 큰 칩은 보이게
상대가 내 스택 크기를 알 수 있게 큰 칩을 앞쪽에 두세요.

7. 딜러 탓하지 않기
카드는 딜러가 고르는 게 아닙니다 🙏

여러분이 겪은 최악의 매너는? 썰은 댓글로 풀어 주세요 👇`,
  },
  {
    id: "sat-1",
    day: "토",
    time: "14:00",
    kind: "정보",
    boardType: "SKETCH",
    boardLabel: "현장 스케치",
    title: "[현장] 〔대회명〕 메인 이벤트 현장",
    photos: true,
    content: `〔대회명〕 메인 이벤트 현장입니다!

📸 등록 대기 줄 — 〔오픈 전부터 줄이 길었습니다〕
📸 메인 홀 — 〔○○개 테이블이 가득 찼습니다〕
📸 딜러분들 — 오늘 진행을 맡은 딜러분들, 고생하셨습니다
📸 파이널 테이블 — 〔파이널까지 남은 ○명〕

▶ 현재 상황
• 참가 〔○○〕 엔트리
• 레벨 〔○〕 진행 중

오늘 현장에 계신 분들, 사진을 댓글로 공유해 주세요!`,
  },
  {
    id: "sat-2",
    day: "토",
    time: "21:00",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "오늘 대회 명장면, 이 핸드 여러분이라면?",
    manualHand: true,
    content: `오늘 〔대회명〕에서 나온 핸드입니다. (참가자 동의를 받고 올립니다)

콜 / 폴드 / 레이즈, 여러분의 선택은?
투표하고 이유를 댓글로 남겨 주세요. 실제 결과는 내일 해설 글에서 공개합니다!

현장에서 인상 깊은 핸드를 본 분은 핸드리뷰 게시판에 직접 그려서 올려 주세요.`,
  },
  {
    id: "sun-1",
    day: "일",
    time: "14:00",
    kind: "초보",
    boardType: "FREE",
    boardLabel: "자유게시판",
    title: "초보가 가장 많이 하는 실수 5가지와 고치는 법",
    content: `1. 너무 많은 핸드를 플레이한다
→ 처음에는 좋은 핸드만 플레이하세요. 페어, AK·AQ, 같은 무늬 높은 카드 정도면 충분합니다.

2. 포지션을 무시한다
→ 같은 핸드라도 앞자리에서는 폴드, 버튼에서는 플레이할 수 있습니다.

3. 림프(콜로만 들어가기)를 자주 한다
→ 들어갈 거면 레이즈, 아니면 폴드가 기본입니다.

4. 원페어에 모든 칩을 건다
→ 상대가 크게 베팅하면 원페어로는 질 때가 많습니다. 탑페어도 접을 줄 알아야 합니다.

5. 지고 나서 감정적으로 친다 (틸트)
→ 크게 지면 쉬는 게 이기는 겁니다. 잠깐 자리에서 일어나세요.

▶ 한 줄 요약
적게 들어가고, 들어갈 땐 강하게, 지면 쉬기.

여러분이 제일 고치기 힘들었던 습관은 뭐였나요? 댓글로 알려 주세요!`,
  },
  {
    id: "sun-2",
    day: "일",
    time: "21:00",
    kind: "핸드분석",
    boardType: "FREE",
    boardLabel: "자유게시판",
    title: "이번 주 핸드 투표 결과 공개 + 해설",
    content: `이번 주 핸드리뷰 투표 해설입니다. 참여해 주신 모든 분 감사합니다!

① 화요일 — BTN AJs 3벳팟, 리버 82bb 올인
투표: 콜 〔○〕% / 폴드 〔○〕%
👉 해설: 콜 쪽이 낫습니다.
• 82bb를 콜해서 약 200bb 팟을 노리므로, 약 41% 이상 이기면 콜이 이득입니다.
• BB는 턴에서 체크했습니다. AK·AQ 같은 강한 A였다면 턴에서 계속 베팅하는 경우가 많습니다.
• 리버 3♣는 바뀐 게 거의 없는 카드라, 큰 오버벳에 놓친 드로우나 K-Q 같은 블러프가 섞이기 좋습니다.
• 내가 A를 하나 들고 있어 상대의 AA·AK 조합이 줄어드는 점도 콜에 유리합니다.
• 다만 아주 타이트한 상대라면 폴드도 충분히 말이 됩니다.

② 수요일 — 77 탑셋, 체크레이즈 올인
투표: 콜 〔○〕% / 폴드 〔○〕%
👉 해설: 콜(받기)입니다.
• 상대의 올인 범위에는 플러시 드로우, 콤보 드로우, 오버페어, 투페어가 많습니다.
• 가장 무서운 9♥T♥ 같은 콤보 드로우를 상대로도 셋이 대략 55~60%로 앞섭니다.
• 88 탑셋에 지는 경우는 조합이 적습니다. 그걸 무서워해서 셋을 접으면 장기적으로 손해입니다.

③ 목요일 — 버블 10bb A7o
투표: 푸시 〔○〕% / 폴드 〔○〕%
👉 해설: 푸시가 기본입니다.
• 10bb 버튼에서 A7o는 충분히 강한 올인 핸드입니다.
• 버블에서 더 몸을 사려야 하는 쪽은 중간 스택입니다. 숏스택은 기다릴수록 블라인드에 깎여 더 불리해집니다.

④ 토요일 — 〔대회명〕 명장면
👉 실제 결과: 〔결과와 해설〕

다음 주 투표도 화·수·목 저녁 9시에 올라옵니다!`,
  },
];

export type ScheduleRow = {
  id: string;
  title: string;
  eventDate: string | null;
  eventEndDate: string | null;
  promoLocation: string | null;
  eventPrize: string | null;
};

const WEEKDAY = "일월화수목금토";

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${m}/${d}(${WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
}

function rangeLabel(row: ScheduleRow) {
  if (!row.eventDate) return "일정 미정";
  return row.eventEndDate && row.eventEndDate !== row.eventDate
    ? `${dayLabel(row.eventDate)} ~ ${dayLabel(row.eventEndDate)}`
    : dayLabel(row.eventDate);
}

/** 대회 캘린더 일정을 상금 큰 순서로 정리한 본문. 일정이 없으면 null. */
export function scheduleSummary(rows: ScheduleRow[], mode: "week" | "weekend"): string | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => prizeToWon(b.eventPrize) - prizeToWon(a.eventPrize));
  const lines = sorted.slice(0, 10).map((row, index) => {
    const parts = [rangeLabel(row), row.promoLocation, row.eventPrize ? `총상금 ${row.eventPrize}` : null].filter(Boolean);
    return `${index + 1}. ${row.title}\n   ${parts.join(" · ")}`;
  });
  const head =
    mode === "week"
      ? "이번 주 열리는 홀덤 대회를 총상금이 큰 순서대로 정리했습니다."
      : "이번 주말 나갈 대회를 고르는 분들을 위해 상금 순으로 모았습니다.";
  const tail =
    mode === "week"
      ? "빠진 대회가 있으면 댓글로 알려 주세요. 확인 후 캘린더에 추가하겠습니다.\n이번 주 어디 나가시나요? 댓글로 남겨 주세요 👇"
      : "🎯 주말 대회 출석부\n참가할 대회와 목표 순위를 댓글로 남겨 주세요. 월요일에 결과 후기로 이어 갑니다!";
  return `${head}
자세한 내용은 정보센터 → 대회 캘린더에서 날짜를 누르면 볼 수 있습니다.

🏆 ${mode === "week" ? "이번 주 대회" : "주말 대회"} (상금 순)
${lines.join("\n")}

▶ 체크 포인트
• 레이트 등록 마감 시간과 리엔트리 횟수는 대회마다 다르니 꼭 확인하세요.

${tail}`;
}
