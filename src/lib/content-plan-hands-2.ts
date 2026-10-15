import type { HandReviewData } from "@/lib/hand-review";
import type { PlanItem } from "@/lib/content-plan";

/** 해설 핸드리뷰 2묶음(운영 계정 발행용) */
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

/** CO A♠Q♦ 오픈 → BTN 3벳 */
const HAND_AQ: HandReviewData = {
  heroPosition: "CO",
  villainPosition: "BTN",
  heroCards: ["As", "Qd"],
  villainCards: [],
  board: [],
  effectiveBb: 100,
  potBb: 12,
  winnerSeat: null,
  streetPots: { preflop: 12 },
  seats: seats([["CO", 100, true, ["As", "Qd"]], ["BTN", 100], ["SB", 100], ["BB", 100]]),
  blinds: BLINDS,
  streets: {
    preflop: [
      { actor: "CO", action: "raise", amount: 2.5 },
      { actor: "BTN", action: "raise", amount: 8 },
      { actor: "SB", action: "fold" },
      { actor: "BB", action: "fold" },
    ],
    flop: [],
    turn: [],
    river: [],
  },
};

/** BTN K♥J♥, 플랍 하트 두 장에 베팅을 받음 */
const HAND_FD: HandReviewData = {
  heroPosition: "BTN",
  villainPosition: "BB",
  heroCards: ["Kh", "Jh"],
  villainCards: [],
  board: ["9h", "5h", "2c"],
  effectiveBb: 100,
  potBb: 8,
  winnerSeat: null,
  streetPots: { preflop: 5.5, flop: 8 },
  seats: seats([["BTN", 100, true, ["Kh", "Jh"]], ["SB", 100], ["BB", 100]]),
  blinds: BLINDS,
  streets: {
    preflop: [
      { actor: "BTN", action: "raise", amount: 2.5 },
      { actor: "SB", action: "fold" },
      { actor: "BB", action: "call", amount: 1.5 },
    ],
    flop: [{ actor: "BB", action: "bet", amount: 2.5 }],
    turn: [],
    river: [],
  },
};

/** BB 12bb Q♠9♠, SB 올인 */
const HAND_SBSHOVE: HandReviewData = {
  heroPosition: "BB",
  villainPosition: "SB",
  heroCards: ["Qs", "9s"],
  villainCards: [],
  board: [],
  effectiveBb: 12,
  potBb: 13,
  winnerSeat: null,
  streetPots: { preflop: 13 },
  seats: seats([["UTG", 30], ["MP", 25], ["CO", 40], ["BTN", 22], ["SB", 12], ["BB", 12, true, ["Qs", "9s"]]]),
  blinds: BLINDS,
  streets: {
    preflop: [
      { actor: "UTG", action: "fold" },
      { actor: "MP", action: "fold" },
      { actor: "CO", action: "fold" },
      { actor: "BTN", action: "fold" },
      { actor: "SB", action: "allin", amount: 11.5 },
    ],
    flop: [],
    turn: [],
    river: [],
  },
};

/** BTN K♦8♣ 탑페어 약한 키커, 리버에서 얇은 가치 베팅? */
const HAND_THIN: HandReviewData = {
  heroPosition: "BTN",
  villainPosition: "BB",
  heroCards: ["Kd", "8c"],
  villainCards: [],
  board: ["Ks", "7d", "3h", "2c", "5s"],
  effectiveBb: 100,
  potBb: 9.5,
  winnerSeat: null,
  streetPots: { preflop: 5.5, flop: 9.5, turn: 9.5, river: 9.5 },
  seats: seats([["BTN", 100, true, ["Kd", "8c"]], ["SB", 100], ["BB", 100]]),
  blinds: BLINDS,
  streets: {
    preflop: [
      { actor: "BTN", action: "raise", amount: 2.5 },
      { actor: "SB", action: "fold" },
      { actor: "BB", action: "call", amount: 1.5 },
    ],
    flop: [
      { actor: "BB", action: "check" },
      { actor: "BTN", action: "bet", amount: 2 },
      { actor: "BB", action: "call", amount: 2 },
    ],
    turn: [
      { actor: "BB", action: "check" },
      { actor: "BTN", action: "check" },
    ],
    river: [{ actor: "BB", action: "check" }],
  },
};

export const HAND_PLAN_2: PlanItem[] = [
  {
    id: "extra-hand-aq-3bet",
    day: "추가",
    time: "언제든",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "CO AQo 오픈에 BTN 3벳 — 콜? 4벳? 폴드? (해설 포함)",
    hand: HAND_AQ,
    content: `[토너먼트 · 유효 스택 100bb]
• 히어로 CO A♠Q♦ 2.5bb 오픈 → BTN 8bb 3벳 → 블라인드 폴드 (팟 12bb)

▶ 생각하는 순서
1. BTN의 3벳 범위: 뒷자리 BTN은 CO 오픈에 넓게 3벳합니다. QQ+ · AK 같은 강한 핸드와 함께 A5s · KQs · 중간 페어 같은 핸드도 섞습니다.
2. AQo의 위치: 이 범위를 상대로 AQo는 평균보다 강한 편이지만, AK · QQ+에는 크게 뒤집니다.
3. 포지션: 콜하면 플랍 이후 히어로가 먼저 액션합니다(아웃 오브 포지션). 이 점이 콜을 조금 불편하게 만듭니다.

▶ 선택지
• 콜: 상대의 넓은 3벳 범위를 상대로 충분히 이기고 있고, 강한 핸드에 크게 잃는 일을 피할 수 있습니다.
• 4벳: 상대가 3벳 범위를 아주 넓게 쓰는 플레이어라면 4벳으로 약한 핸드를 접게 만드는 것도 좋습니다.
• 폴드: 상대가 거의 강한 핸드로만 3벳하는 타이트한 플레이어라면 폴드도 나쁘지 않습니다.

▶ 결론
상대 정보가 없다면 콜이 가장 무난합니다. 상대가 3벳을 자주 한다는 정보가 있으면 4벳 비중을 늘리세요. 핵심은 「상대의 3벳 범위가 얼마나 넓은가」입니다.

여러분은 이 상황에서 어떻게 하시나요? 상대 스타일별로 선택이 어떻게 바뀌는지 댓글로 이야기해 주세요.`,
  },
  {
    id: "extra-hand-flushdraw",
    day: "추가",
    time: "언제든",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "BTN KJs 플러시 드로우 + 오버카드 — 세미블러프 레이즈할까? (해설 포함)",
    hand: HAND_FD,
    content: `[토너먼트 · 유효 스택 100bb]
• 히어로 BTN K♥J♥ 2.5bb 오픈 → BB 콜 (팟 5.5bb)
• 플랍 9♥ 5♥ 2♣: BB 2.5bb 베팅(동크 베팅) (팟 8bb)

▶ 생각하는 순서
1. 내 핸드의 힘: 아직 페어는 없지만 하트 플러시 드로우(9장)와 K · J 오버카드(최대 6장)가 있습니다. 리버까지 보면 대략 절반 가까이 이기는 그림입니다.
2. 상대의 베팅: BB가 먼저 베팅하는 것은 9x 같은 중간 페어, 5x · 2x 같은 약한 페어, 드로우가 섞인 경우가 많습니다.
3. 선택지: 콜로 다음 카드를 보거나, 레이즈로 지금 팟을 가져올 기회를 만들 수 있습니다.

▶ 레이즈(세미블러프)의 장점
• 상대가 약한 페어로 폴드하면 바로 팟을 가져옵니다.
• 콜을 받아도 드로우와 오버카드로 이길 기회가 많습니다.
• 플러시가 완성됐을 때 팟이 커져 있어 더 많이 받을 수 있습니다.

▶ 결론
강한 드로우는 레이즈하기 좋은 핸드입니다. 상대가 체크레이즈 · 리레이즈를 자주 하는 공격적인 플레이어라면 콜로 가볍게 가는 선택도 괜찮습니다. 보통은 레이즈 크기를 팟의 2.5~3배(베팅의 3배 정도)로 잡습니다.

여러분은 콜인가요, 레이즈인가요? 이유를 남겨 주세요.`,
  },
  {
    id: "extra-hand-bb-q9s",
    day: "추가",
    time: "언제든",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "12bb BB Q9s, SB가 올인했다 — 콜해야 할까? (해설 포함)",
    hand: HAND_SBSHOVE,
    content: `[토너먼트 · 유효 스택 12bb]
• 모두 폴드 → SB 올인 12bb → 히어로 BB Q♠9♠ (팟 13bb)

▶ 생각하는 순서
1. 콜에 필요한 승률: 콜하려면 11bb를 더 내고 24bb 팟을 다툽니다. 11 ÷ 24 ≈ 46%. 46% 이상 이기면 콜이 이득입니다.
2. SB의 올인 범위: 블라인드 대결에서 12bb SB는 아주 넓게 올인합니다. 모든 페어, 대부분의 A, K, 연결된 카드까지 들어갑니다.
3. Q9s의 승률: 이렇게 넓은 범위를 상대로 Q9 수티드는 대략 절반 안팎의 승률을 가집니다.

▶ 결론
필요 승률(약 46%)과 비슷하거나 조금 높아 콜이 무난합니다. 상대가 아주 타이트하게 올인하는 플레이어라면 폴드 쪽으로 기울고, 버블처럼 탈락이 아주 큰 손해인 상황이라면 더 조심해야 합니다. 푸시폴드 차트에서 자기 스택과 자리별 콜 범위를 한 번 확인해 보세요.

비슷한 상황에서 어디까지 콜하시나요? 기준을 댓글로 공유해 주세요.`,
  },
  {
    id: "extra-hand-thin-value",
    day: "추가",
    time: "언제든",
    kind: "핸드분석",
    boardType: "HAND_REVIEW",
    boardLabel: "핸드리뷰",
    title: "BTN K8o 탑페어, 리버에서 얇은 가치 베팅을 할까? (해설 포함)",
    hand: HAND_THIN,
    content: `[토너먼트 · 유효 스택 100bb]
• 히어로 BTN K♦8♣ 2.5bb 오픈 → BB 콜 (팟 5.5bb)
• 플랍 K♠ 7♦ 3♥: BB 체크 → 히어로 2bb 베팅 → BB 콜 (팟 9.5bb)
• 턴 2♣: 체크, 체크
• 리버 5♠: BB 체크 → 히어로 차례

▶ 생각하는 순서
1. 내 패: 탑페어지만 키커가 약합니다. KQ · KJ 같은 더 좋은 K에는 집니다.
2. 상대의 범위: 플랍에서 콜하고 턴 · 리버를 체크한 BB는 7x(7 페어), 3x, 약한 K(K2 · K4 · K5 일부), A-high 같은 쇼다운 핸드가 많습니다. 강한 K는 턴에서 베팅하는 경우가 많아 상대적으로 적습니다.
3. 베팅하면: 7x와 약한 K가 콜할 수 있어 가치가 있습니다. 더 강한 핸드에 체크레이즈를 당할 수도 있습니다.

▶ 결론
팟의 1/3 정도(3bb 안팎)로 작게 베팅하는 「얇은 가치 베팅」이 좋습니다. 작게 걸면 더 약한 핸드가 많이 콜하고, 체크레이즈를 당하면 폴드를 생각할 수 있습니다. 상대가 리버에 블러프 체크레이즈를 자주 한다면 체크로 쇼다운하는 것도 괜찮습니다.

여러분은 베팅인가요, 체크인가요? 베팅한다면 크기는 얼마로 하시나요?`,
  },
];
