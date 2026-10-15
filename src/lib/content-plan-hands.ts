import type { HandReviewData } from "@/lib/hand-review";
import type { PlanItem } from "@/lib/content-plan";

/**
 * 해설이 들어간 핸드리뷰 4편(운영 계정 발행용). 투표만 받는 글과 달리 본문에 생각하는 순서와 결론까지 담습니다.
 * 관리자 「콘텐츠 발행」 화면에서 POKA 계정으로 올립니다.
 */
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

/** UTG K♣K♦, 플랍에 A가 떨어진 뒤 리버 베팅을 받음 */
const HAND_KK: HandReviewData = {
  heroPosition: "UTG",
  villainPosition: "BTN",
  heroCards: ["Kc", "Kd"],
  villainCards: [],
  board: ["As", "7d", "2c", "5h", "Ts"],
  effectiveBb: 100,
  potBb: 11.9,
  winnerSeat: null,
  streetPots: { preflop: 5.9, flop: 11.9, turn: 11.9, river: 11.9 },
  seats: seats([["UTG", 100, true, ["Kc", "Kd"]], ["MP", 100], ["CO", 100], ["BTN", 100], ["SB", 100], ["BB", 100]]),
  blinds: BLINDS,
  streets: {
    preflop: [
      { actor: "UTG", action: "raise", amount: 2.2 },
      { actor: "MP", action: "fold" },
      { actor: "CO", action: "fold" },
      { actor: "BTN", action: "call", amount: 2.2 },
      { actor: "SB", action: "fold" },
      { actor: "BB", action: "fold" },
    ],
    flop: [
      { actor: "UTG", action: "check" },
      { actor: "BTN", action: "bet", amount: 3 },
      { actor: "UTG", action: "call", amount: 3 },
    ],
    turn: [
      { actor: "UTG", action: "check" },
      { actor: "BTN", action: "check" },
    ],
    river: [
      { actor: "UTG", action: "check" },
      { actor: "BTN", action: "bet", amount: 8 },
    ],
  },
};

/** 블라인드 배틀: SB Q♥9♥ 투페어, BB 체크레이즈 */
const HAND_SBBB: HandReviewData = {
  heroPosition: "SB",
  villainPosition: "BB",
  heroCards: ["Qh", "9h"],
  villainCards: [],
  board: ["Qd", "9c", "4s"],
  effectiveBb: 100,
  potBb: 15,
  winnerSeat: null,
  streetPots: { preflop: 6, flop: 15 },
  seats: seats([["CO", 100], ["BTN", 100], ["SB", 100, true, ["Qh", "9h"]], ["BB", 100]]),
  blinds: BLINDS,
  streets: {
    preflop: [
      { actor: "CO", action: "fold" },
      { actor: "BTN", action: "fold" },
      { actor: "SB", action: "raise", amount: 3 },
      { actor: "BB", action: "call", amount: 2 },
    ],
    flop: [
      { actor: "SB", action: "bet", amount: 2 },
      { actor: "BB", action: "raise", amount: 7 },
    ],
    turn: [],
    river: [],
  },
};

/** 15bb BTN K♦T♣, 앞에서 UTG 림프 */
const HAND_SHORT: HandReviewData = {
  heroPosition: "BTN",
  villainPosition: "UTG",
  heroCards: ["Kd", "Tc"],
  villainCards: [],
  board: [],
  effectiveBb: 15,
  potBb: 2.5,
  winnerSeat: null,
  streetPots: { preflop: 2.5 },
  seats: seats([["UTG", 40], ["MP", 25], ["CO", 30], ["BTN", 15, true, ["Kd", "Tc"]], ["SB", 20], ["BB", 35]]),
  blinds: BLINDS,
  streets: {
    preflop: [
      { actor: "UTG", action: "call", amount: 1 },
      { actor: "MP", action: "fold" },
      { actor: "CO", action: "fold" },
    ],
    flop: [],
    turn: [],
    river: [],
  },
};

/** BB 8♠8♦, 드로우가 빗나간 리버에 베팅을 받음(블러프 캐치) */
const HAND_CATCH: HandReviewData = {
  heroPosition: "BB",
  villainPosition: "CO",
  heroCards: ["8s", "8d"],
  villainCards: [],
  board: ["Kh", "7h", "3c", "2d", "5s"],
  effectiveBb: 100,
  potBb: 9.5,
  winnerSeat: null,
  streetPots: { preflop: 5.5, flop: 9.5, turn: 9.5, river: 9.5 },
  seats: seats([["CO", 100], ["BTN", 100], ["SB", 100], ["BB", 100, true, ["8s", "8d"]]]),
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
      { actor: "CO", action: "bet", amount: 2 },
      { actor: "BB", action: "call", amount: 2 },
    ],
    turn: [
      { actor: "BB", action: "check" },
      { actor: "CO", action: "check" },
    ],
    river: [
      { actor: "BB", action: "check" },
      { actor: "CO", action: "bet", amount: 9 },
    ],
  },
};

export const HAND_PLAN: PlanItem[] = [
  {
    id: "extra-hand-kk-ace",
    day: "추가",
    time: "언제든",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "UTG KK, 플랍에 A가 떨어졌다 — 리버 베팅에 콜할까? (해설 포함)",
    hand: HAND_KK,
    content: `[토너먼트 · 유효 스택 100bb]
• 히어로 UTG K♣K♦ 2.2bb 오픈 → BTN 콜 (팟 5.9bb)
• 플랍 A♠ 7♦ 2♣: 히어로 체크 → BTN 3bb 베팅 → 히어로 콜 (팟 11.9bb)
• 턴 5♥: 체크, 체크
• 리버 T♠: 히어로 체크 → BTN 8bb 베팅 (팟의 약 2/3)

▶ 생각하는 순서
1. 상대의 범위부터: BTN이 UTG 오픈에 콜만 했다면 AQ · AJ · AT 같은 A, 77~JJ 같은 중간 페어, 수티드 커넥터가 많습니다. AK · AA는 보통 3벳을 섞어서 콜 범위에는 적습니다.
2. 플랍 체크 이유: A가 떨어진 보드는 상대 범위에 A가 많아 KK로 베팅하면 더 좋은 패만 콜하고 나쁜 패는 폴드합니다. 체크 후 콜로 블러프를 받는 선택이 자연스럽습니다.
3. 턴 체크백의 의미: A를 가진 상대는 턴에 가치 베팅을 하는 경우가 많습니다. 턴을 체크했다는 건 A가 아닌 핸드(중간 페어, 포기한 블러프)의 비중이 늘었다는 신호입니다.
4. 리버 T♠: AT가 투페어가 됐지만, 턴에 체크한 AT는 많지 않습니다. 리버에서 상대가 갑자기 2/3 베팅을 한다면 쇼다운 가치가 없는 블러프와 약한 A의 얇은 가치 베팅이 섞여 있습니다.

▶ 결론
팟 오즈는 8 ÷ (11.9 + 8 + 8) ≈ 29%. 약 3번 중 1번만 이겨도 콜이 손해가 아닙니다. 턴 체크백으로 A 비중이 줄었으니 콜이 무난한 선택입니다. 다만 상대가 평소 블러프를 거의 하지 않는 플레이어라면 폴드도 충분히 가능합니다.

여러분은 콜인가요, 폴드인가요? 상대가 어떤 핸드였을지 댓글로 남겨 주세요.`,
  },
  {
    id: "extra-hand-sb-twopair",
    day: "추가",
    time: "언제든",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "블라인드 배틀 SB Q9s 투페어, BB 체크레이즈를 받았다 (해설 포함)",
    hand: HAND_SBBB,
    content: `[토너먼트 · 유효 스택 100bb]
• 앞에서 모두 폴드 → 히어로 SB Q♥9♥ 3bb 레이즈 → BB 콜 (팟 6bb)
• 플랍 Q♦ 9♣ 4♠: 히어로 2bb 베팅 → BB 7bb 체크레이즈 (팟 15bb)

▶ 생각하는 순서
1. 내 패의 위치: 탑투페어입니다. 이 보드에서 나보다 강한 패는 QQ · 99 · 44 셋 정도이고, 블라인드 배틀에서는 상대가 셋을 가질 확률이 높지 않습니다.
2. 상대의 체크레이즈 범위: Q 원페어(QJ · QT), 오픈엔드 드로우(JT · T8 · 87 같은 스트레이트 드로우), 9 페어의 공격적인 플레이, 그리고 셋이 섞여 있습니다.
3. 보드의 위험: 하트 플러시 드로우는 없지만, JT · KJ · T8 같은 스트레이트 드로우가 턴에 많이 맞습니다. 투페어는 지금 강하지만 턴 카드에 따라 약해질 수 있습니다.

▶ 선택지
• 콜: 상대의 블러프와 드로우를 계속 끌고 가지만, 턴에 J · T · 8이 떨어지면 판단이 어려워집니다.
• 3벳(재레이즈): 드로우에게 값을 받고, Q 원페어에게서 가치를 얻습니다. 블라인드 배틀처럼 범위가 넓은 상황에서는 투페어로 크게 가는 것이 일반적입니다.

▶ 결론
탑투페어는 블라인드 배틀에서 거의 항상 가치가 충분합니다. 드로우가 많은 보드라 3벳으로 팟을 키우는 선택을 추천합니다. 상대가 셋이면 어쩔 수 없는 쿨러로 받아들이는 것이 장기적으로 이득입니다.

여러분은 콜인가요, 3벳인가요? 이유를 댓글로 남겨 주세요.`,
  },
  {
    id: "extra-hand-short-limp",
    day: "추가",
    time: "언제든",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "15bb BTN KTo, 앞에서 림프가 들어왔다 — 올인? 폴드? (해설 포함)",
    hand: HAND_SHORT,
    content: `[토너먼트 · 히어로 15bb]
• UTG 1bb 림프 → MP · CO 폴드
• 히어로 BTN K♦T♣ (팟 2.5bb)

▶ 생각하는 순서
1. 스택 크기: 15bb는 레이즈 후 폴드하기 아까운 스택입니다. 이 구간에서는 「올인 아니면 폴드」가 기본 전략이 됩니다.
2. 림프의 의미: 토너먼트에서 앞자리 림프는 약한 핸드(작은 페어, 수티드 커넥터)이거나, 가끔 강한 핸드로 함정을 파는 경우입니다. 대부분은 약한 쪽입니다.
3. 팟의 크기: 블라인드와 림프로 이미 2.5bb가 있습니다. 올인으로 이 팟을 가져오기만 해도 스택의 약 17%가 늘어납니다.
4. 콜을 받았을 때: K-T 오프슈트는 작은 페어와 비슷한 승률, A-x 대부분과도 크게 뒤처지지 않습니다. 콜을 받아도 완전히 지는 경우는 많지 않습니다.

▶ 결론
BTN 15bb K-T 오프슈트는 앞에서 림프가 있을 때 올인 범위에 넉넉히 들어갑니다. 림프 뒤 올인(아이솔레이션 셔브)은 이미 들어간 칩을 가져가는 효과가 커서, 오픈 올인보다도 더 넓게 할 수 있습니다. 푸시폴드 차트로 자기 스택 · 자리별 범위를 한 번 확인해 보세요.

비슷한 상황에서 어떤 핸드까지 올인하시나요? 댓글로 기준을 공유해 주세요.`,
  },
  {
    id: "extra-hand-bluffcatch",
    day: "추가",
    time: "언제든",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "BB 88, 드로우가 빗나간 리버 — 블러프 캐치할까? (해설 포함)",
    hand: HAND_CATCH,
    content: `[토너먼트 · 유효 스택 100bb]
• CO 2.5bb 오픈 → 히어로 BB 8♠8♦ 콜 (팟 5.5bb)
• 플랍 K♥ 7♥ 3♣: 히어로 체크 → CO 2bb 베팅 → 히어로 콜 (팟 9.5bb)
• 턴 2♦: 체크, 체크
• 리버 5♠: 히어로 체크 → CO 9bb 베팅 (팟과 거의 같은 크기)

▶ 생각하는 순서
1. 플랍: K가 깔린 마른 보드에 하트 두 장. CO의 작은 베팅은 범위 전체로 하는 경우가 많아, 88로 콜하기 좋은 상황입니다.
2. 턴 체크백: K를 가진 CO는 턴에도 가치 베팅을 하는 경우가 많습니다. 턴 체크백은 K가 아닌 핸드, 특히 하트 드로우나 포기한 핸드의 비중을 높입니다.
3. 리버 5♠: 하트 플러시는 완성되지 않았습니다. 빗나간 하트 드로우(A♥x♥, Q♥J♥ 등)는 쇼다운으로 이길 수 없어 블러프할 이유가 생깁니다. 4-6 같은 스트레이트는 CO 오픈 범위에 거의 없습니다.
4. 팟 크기 베팅: 큰 베팅은 강한 패와 블러프 양쪽에 모두 쓰이지만, 턴 체크백 뒤의 팟 크기 베팅은 블러프 쪽으로 기울어 보이는 경우가 많습니다.

▶ 결론
팟 오즈는 9 ÷ (9.5 + 9 + 9) ≈ 33%. 3번 중 1번만 이기면 됩니다. 턴 체크백과 빗나간 하트 드로우를 생각하면 88은 좋은 블러프 캐처입니다. 콜을 추천합니다. 다만 같은 상대가 리버에서 블러프를 거의 하지 않는다는 기록이 있다면 폴드도 괜찮습니다.

여러분이라면 콜하시겠어요? 상대 핸드를 맞혀 보세요.`,
  },
];
