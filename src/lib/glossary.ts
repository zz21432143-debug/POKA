/**
 * 홀덤 · 딜러 용어 사전(ㄱ~ㅎ · A~Z). 뜻은 POKA가 직접 쓴 한 줄 설명이고, 자세한 글이 있으면 그 가이드로 이어 줍니다.
 * 규칙 용어는 매장 하우스 룰이 우선합니다.
 */
export type GlossaryTerm = { term: string; en?: string; def: string; href?: string };

const H = (slug: string) => `/info/holdem/${slug}`;
const G = (slug: string) => `/info/guide/${slug}`;

export const GLOSSARY: GlossaryTerm[] = [
  { term: "갓샷", en: "Gutshot", def: "가운데 한 장이 빠진 스트레이트 드로우. 예: 6-7-9-10에서 8을 기다림. 아웃츠는 4장." },
  { term: "넛", en: "Nuts", def: "지금 보드에서 만들 수 있는 가장 강한 패. 「넛 플러시」는 그 보드에서 가장 높은 플러시." },
  { term: "노출 카드", en: "Exposed card", def: "돌리는 중이나 액션 중에 앞면이 보인 카드. 딜러 실수인지 선수 실수인지에 따라 처리가 다름.", href: G("exposed-card-rules") },
  { term: "데드 버튼", en: "Dead button", def: "버튼 자리 선수가 빠졌을 때 버튼이 빈자리에 남는 것. 블라인드 순서를 맞추기 위한 방식.", href: G("dead-button-rules") },
  { term: "동크 벳", en: "Donk bet", def: "앞 스트리트에서 레이즈한 사람 앞에서, 먼저 말하는 사람이 바로 벳하는 것.", href: H("probe-donk-bets") },
  { term: "드로우", en: "Draw", def: "아직 완성되지 않았지만 다음 카드로 스트레이트 · 플러시 등이 될 수 있는 패." },
  { term: "드라이 보드", en: "Dry board", def: "드로우가 거의 없는 보드. 예: K-7-2 무늬 셋 다 다름. 반대말은 웻 보드.", href: H("board-texture") },
  { term: "딜레이드 c벳", en: "Delayed c-bet", def: "프리플랍 레이저가 플랍은 체크로 넘기고 턴에 벳하는 것.", href: H("delayed-cbet") },
  { term: "레이트 등록", en: "Late registration", def: "토너먼트가 시작된 뒤에도 정해진 레벨까지 참가를 받는 것. 끝나는 시점을 「레지 마감」이라고 함.", href: G("late-reg-reentry") },
  { term: "레인지", en: "Range", def: "상대가 이 상황에서 들고 있을 수 있는 패의 묶음. 패 하나가 아니라 묶음으로 생각하는 것이 기본.", href: H("thinking-in-ranges") },
  { term: "레벨", en: "Level", def: "토너먼트 블라인드 단계. 정해진 시간이 지나면 블라인드 · 앤티가 올라감.", href: G("blind-structure-reading") },
  { term: "리바인", en: "Rebuy", def: "칩을 다 잃었거나 일정 이하일 때 칩을 다시 사서 같은 자리에서 이어 하는 것. 리엔트리와 다름.", href: H("rebuy-reentry") },
  { term: "리버", en: "River", def: "보드 다섯 번째 카드, 또는 그 카드가 열린 뒤의 마지막 베팅 라운드.", href: H("river-call-decisions") },
  { term: "리엔트리", en: "Re-entry", def: "탈락한 뒤 새로 등록해 새 자리 · 새 칩으로 다시 들어가는 것.", href: H("rebuy-reentry") },
  { term: "림프", en: "Limp", def: "프리플랍에서 레이즈 없이 빅 블라인드만큼만 콜하고 들어가는 것.", href: H("open-sizing-limping") },
  { term: "머킹", en: "Muck", def: "폴드하거나 진 카드를 모아 버리는 것, 또는 그 버린 카드 더미." },
  { term: "메인팟", en: "Main pot", def: "올인한 사람 중 가장 적게 건 사람까지 모두가 다투는 팟. 그 위로 더 건 칩은 사이드팟.", href: G("side-pots") },
  { term: "미스딜", en: "Misdeal", def: "카드가 잘못 돌아가 그 핸드를 처음부터 다시 돌리는 것. 어떤 경우인지는 TDA · 하우스 룰을 따름.", href: G("dealer-mistakes") },
  { term: "밸런싱", en: "Table balancing", def: "토너먼트에서 테이블마다 인원이 비슷하도록 선수를 옮기는 것.", href: G("table-balancing") },
  { term: "밸류 벳", en: "Value bet", def: "더 나쁜 패에게 콜을 받으려고 하는 벳. 블러프의 반대.", href: H("value-bet-sizing") },
  { term: "번", en: "Burn", def: "플랍 · 턴 · 리버를 열기 전에 맨 위 카드 한 장을 앞면이 안 보이게 버리는 것." },
  { term: "버블", en: "Bubble", def: "토너먼트 입상권 바로 직전 단계. 한 명만 더 떨어지면 모두 입상하는 때.", href: H("icm-basics") },
  { term: "버튼", en: "Button", def: "딜러 위치를 표시하는 원판. 매 핸드 시계 방향으로 한 칸씩 옮기고, 플랍부터 가장 늦게 말함.", href: G("seats-and-button") },
  { term: "보드", en: "Board", def: "테이블 가운데에 모두가 함께 쓰는 카드 5장(플랍 3 · 턴 1 · 리버 1)." },
  { term: "블라인드", en: "Blinds", def: "카드를 받기 전에 버튼 왼쪽 두 자리가 의무로 내는 칩. 스몰 블라인드와 빅 블라인드.", href: G("blinds-antes") },
  { term: "BB 앤티", en: "Big blind ante", def: "앤티를 사람마다 걷지 않고, 빅 블라인드 자리가 테이블 몫을 한 번에 내는 방식.", href: H("ante-effect") },
  { term: "블러프", en: "Bluff", def: "지금은 약한 패로 상대를 폴드시키려고 하는 벳 · 레이즈.", href: H("choosing-bluffs") },
  { term: "블러프 캐치", en: "Bluff catch", def: "상대 블러프만 이기는 애매한 패로 콜하는 것.", href: H("bluff-catching") },
  { term: "블로커", en: "Blocker", def: "내가 든 카드 때문에 상대가 특정 패를 들 확률이 줄어드는 것. 예: A를 들면 상대 AA 확률이 줄어듦.", href: H("choosing-bluffs") },
  { term: "사이드팟", en: "Side pot", def: "올인한 사람보다 더 건 칩으로 따로 만드는 팟. 그 칩을 낸 사람끼리만 다툼.", href: G("multiple-side-pots") },
  { term: "세미 블러프", en: "Semi-bluff", def: "지금은 약하지만 다음 카드로 강해질 수 있는 드로우로 하는 벳." },
  { term: "셋", en: "Set", def: "포켓 페어에 보드 한 장이 맞아 같은 숫자 셋이 된 것. 손 한 장 + 보드 페어는 「트립스」.", href: H("set-mining") },
  { term: "쇼다운", en: "Showdown", def: "마지막 베팅이 끝난 뒤 남은 사람이 패를 보여 승자를 가리는 것.", href: G("showdown") },
  { term: "숏스택", en: "Short stack", def: "블라인드에 비해 칩이 적은 스택. 토너먼트에서는 보통 20BB 아래를 말함.", href: H("tournament-stack-strategy") },
  { term: "스퀴즈", en: "Squeeze", def: "앞에서 레이즈와 콜이 나온 뒤에 하는 3벳." },
  { term: "스트래들", en: "Straddle", def: "카드를 받기 전에 빅 블라인드의 두 배를 자발적으로 내는 것. 허용하는 매장에서만.", href: G("straddle-rules") },
  { term: "스트링 베팅", en: "String bet", def: "칩을 여러 번 나눠 내며 금액을 늘리는 것. 금지 행동이라 첫 동작만 인정하는 경우가 많음." },
  { term: "스플릿", en: "Split pot", def: "가장 좋은 다섯 장이 같아 팟을 똑같이 나누는 것. 「찹」이라고도 함.", href: G("showdown-reading") },
  { term: "슬로우플레이", en: "Slowplay", def: "아주 강한 패를 일부러 약하게(체크 · 콜) 플레이하는 것.", href: H("slowplay") },
  { term: "아웃츠", en: "Outs", def: "나오면 내 패가 이기게 되는 남은 카드 수. 플러시 드로우는 9장.", href: H("pot-odds-equity") },
  { term: "아웃 오브 포지션", en: "Out of position", def: "상대보다 먼저 말해야 하는 자리. 반대는 인 포지션.", href: H("position") },
  { term: "애드온", en: "Add-on", def: "정해진 시점(보통 레지 마감 무렵)에 칩을 한 번 더 사는 것.", href: H("add-on") },
  { term: "앤티", en: "Ante", def: "블라인드와 별도로 내는 강제 베팅. 팟을 키워 액션을 늘림.", href: G("blinds-antes") },
  { term: "얼리칩", en: "Early chip", def: "정해진 시간 안에 자리에 앉으면 추가로 주는 칩. 매장 · 대회마다 조건이 다름.", href: G("tournament-terms") },
  { term: "에퀴티", en: "Equity", def: "지금 패가 끝까지 갔을 때 팟을 가져갈 몫(승률).", href: H("pot-odds-equity") },
  { term: "오드 칩", en: "Odd chip", def: "팟을 나누고 남는 칩. 누구에게 주는지는 하우스 룰(보통 버튼 왼쪽에 가까운 사람)을 따름.", href: G("showdown-reading") },
  { term: "오버벳", en: "Overbet", def: "팟보다 큰 금액을 벳하는 것.", href: H("overbet") },
  { term: "오버카드", en: "Overcard", def: "보드에 있는 카드보다 높은 카드. 예: 보드 9-6-2에서 손의 A · K." },
  { term: "올인", en: "All-in", def: "가진 칩을 모두 거는 것. 그보다 많이 건 칩은 사이드팟으로 나눔.", href: G("side-pots") },
  { term: "웻 보드", en: "Wet board", def: "스트레이트 · 플러시 드로우가 많은 보드. 예: 9♥-8♥-7♠.", href: H("board-texture") },
  { term: "이펙티브 스택", en: "Effective stack", def: "두 사람 중 작은 스택. 그 이상은 서로 주고받을 수 없어 판단의 기준이 됨.", href: H("spr-planning") },
  { term: "인 포지션", en: "In position", def: "상대보다 나중에 말하는 자리. 상대 액션을 보고 결정할 수 있어 유리함.", href: H("position") },
  { term: "체크 레이즈", en: "Check-raise", def: "먼저 체크한 뒤 상대가 벳하면 레이즈하는 것.", href: H("check-raise") },
  { term: "카운터펠트", en: "Counterfeit", def: "보드에 카드가 깔리면서 내 패가 약해지거나 쓸모없어지는 것.", href: G("counterfeit-hands") },
  { term: "컨티뉴에이션 벳", en: "C-bet", def: "프리플랍에 레이즈한 사람이 플랍에서 이어서 하는 벳. 줄여서 c벳.", href: H("continuation-bet") },
  { term: "컬러업", en: "Color-up", def: "블라인드가 오르면 작은 단위 칩을 큰 단위 칩으로 바꾸는 것.", href: G("color-up") },
  { term: "컷오프", en: "Cutoff", def: "버튼 바로 오른쪽 자리. 줄여서 CO.", href: G("seats-and-button") },
  { term: "콜드콜", en: "Cold call", def: "앞에 이미 레이즈가 있을 때 처음으로 칩을 넣으며 콜만 하는 것.", href: H("cold-calling") },
  { term: "키커", en: "Kicker", def: "같은 페어 · 같은 족보일 때 승부를 가르는 남은 카드." },
  { term: "탑 페어", en: "Top pair", def: "보드에서 가장 높은 카드와 내 손 한 장이 맞은 페어." },
  { term: "턴", en: "Turn", def: "보드 네 번째 카드, 또는 그 뒤의 베팅 라운드.", href: H("turn-river-planning") },
  { term: "트립스", en: "Trips", def: "보드 페어에 내 손 한 장이 맞아 같은 숫자 셋이 된 것. 포켓 페어로 만든 것은 「셋」." },
  { term: "틸트", en: "Tilt", def: "진 핸드 뒤 감정이 흔들려 평소보다 나쁜 결정을 하는 상태." },
  { term: "팟 오즈", en: "Pot odds", def: "콜하려고 낼 칩 ÷ 콜까지 넣은 전체 팟. 이 비율보다 승률이 높으면 길게 보아 이득인 콜.", href: H("pot-odds-equity") },
  { term: "팟 리밋", en: "Pot limit", def: "한 번에 올릴 수 있는 최대 금액이 지금 팟 크기인 베팅 방식. 오마하(PLO)에서 주로 씀.", href: H("omaha-rules") },
  { term: "포켓 페어", en: "Pocket pair", def: "손패 두 장이 같은 숫자인 것. 예: 7-7." },
  { term: "포지션", en: "Position", def: "버튼을 기준으로 한 내 자리. 늦게 말할수록 정보가 많아 유리함.", href: H("position") },
  { term: "프로브 벳", en: "Probe bet", def: "앞 스트리트에서 상대가 벳하지 않고 넘겼을 때, 먼저 말하는 사람이 하는 벳.", href: H("probe-donk-bets") },
  { term: "프리플랍", en: "Preflop", def: "플랍이 열리기 전, 손패 두 장만 받은 상태의 베팅 라운드.", href: H("preflop-chart-reading") },
  { term: "플랍", en: "Flop", def: "보드 첫 세 장, 또는 그 뒤의 베팅 라운드." },
  { term: "플로어", en: "Floor", def: "판정 · 진행 · 딜러 배치를 맡는 매장 책임자. 테이블에서 정리가 안 되면 부름.", href: G("floor-role") },
  { term: "플로트", en: "Float", def: "뒤 자리에서 상대 벳에 콜해 두고, 상대가 멈추면 다음 스트리트에 가져오는 플레이.", href: H("float") },
  { term: "피치", en: "Pitch", def: "딜러가 카드를 선수 앞으로 정확히 날려 보내는 동작.", href: G("shuffle-pitch-practice") },
  { term: "하이잭", en: "Hijack", def: "컷오프 바로 오른쪽 자리. 줄여서 HJ.", href: G("seats-and-button") },
  { term: "핸드 포 핸드", en: "Hand-for-hand", def: "입상권 직전에 모든 테이블이 한 핸드씩 동시에 진행하는 방식.", href: G("hand-for-hand") },
  { term: "헤즈업", en: "Heads-up", def: "두 사람만 남아 하는 승부. 버튼이 스몰 블라인드를 냄.", href: H("heads-up-final-table") },
  { term: "히어로 · 빌런", en: "Hero · Villain", def: "핸드리뷰에서 글쓴이 자신(히어로)과 상대(빌런)를 부르는 말.", href: G("reading-hand-reviews") },
  { term: "3벳", en: "3-bet", def: "프리플랍 첫 레이즈에 다시 하는 레이즈. 그다음 레이즈는 4벳.", href: H("three-bet-four-bet") },
  { term: "GTO", en: "Game Theory Optimal", def: "상대가 어떻게 해도 이용당하지 않도록 균형을 맞춘 이론상 전략. 실전에서는 기준점으로 씀.", href: "/info/push-fold" },
  { term: "ICM", en: "Independent Chip Model", def: "토너먼트 칩을 남은 상금 순위 가치로 바꿔 계산하는 모델. 칩 1개의 가치가 스택마다 다름.", href: H("icm-basics") },
  { term: "M 값", en: "M-ratio", def: "내 스택 ÷ 한 바퀴 비용(스몰 + 빅 블라인드 + 앤티 합계). 아무것도 안 하면 몇 바퀴 버티는지.", href: H("tournament-stack-strategy") },
  { term: "SPR", en: "Stack-to-pot ratio", def: "이펙티브 스택 ÷ 플랍 팟 크기. 작을수록 올인까지 가기 쉬움.", href: H("spr-planning") },
  { term: "UTG", en: "Under the gun", def: "프리플랍에 가장 먼저 말하는 자리(빅 블라인드 바로 왼쪽).", href: G("action-order") },
];

const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const BASE: Record<string, string> = { ㄲ: "ㄱ", ㄸ: "ㄷ", ㅃ: "ㅂ", ㅆ: "ㅅ", ㅉ: "ㅈ" };

/** 첫 글자 초성(쌍자음은 기본 자음으로) · 한글이 아니면 A~Z */
export function initialOf(term: string) {
  const code = term.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const cho = CHO[Math.floor((code - 0xac00) / 588)];
    return BASE[cho] ?? cho;
  }
  return "A~Z";
}

export const GLOSSARY_INITIALS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "A~Z"] as const;

/** 초성별 묶음(가나다순) */
export function glossaryGroups(terms: GlossaryTerm[] = GLOSSARY) {
  const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term, "ko"));
  return GLOSSARY_INITIALS.map((initial) => ({ initial, terms: sorted.filter((t) => initialOf(t.term) === initial) })).filter((g) => g.terms.length);
}
