/**
 * 참고 표(인쇄용) 숫자. 아웃츠 · 팟 오즈는 공식으로 계산하고,
 * 프리플랍 맞대결은 public/data/preflop-eq.json(30만 번 시뮬레이션, 승률 계산기와 같은 데이터)에서 뽑은 값입니다(테스트로 확인).
 */

/** 아웃츠 → 다음 한 장(턴) · 두 장(턴+리버) · 리버 한 장 확률(%) */
export function outsRow(outs: number) {
  const turn = (outs / 47) * 100;
  const both = (1 - ((47 - outs) * (46 - outs)) / (47 * 46)) * 100;
  const river = (outs / 46) * 100;
  return { outs, turn, both, river };
}

export const OUTS_EXAMPLES: { outs: number; label: string }[] = [
  { outs: 2, label: "포켓 페어 → 셋" },
  { outs: 4, label: "거트샷(가운데 빈 스트레이트)" },
  { outs: 6, label: "오버카드 2장" },
  { outs: 8, label: "양방 스트레이트 드로우" },
  { outs: 9, label: "플러시 드로우" },
  { outs: 12, label: "플러시 드로우 + 거트샷" },
  { outs: 15, label: "플러시 드로우 + 양방" },
];

/** 상대 벳 크기(팟 대비) → 콜에 필요한 승률(%) = 벳 ÷ (팟 + 벳 × 2) */
export function potOddsNeeded(fraction: number) {
  return (fraction / (1 + 2 * fraction)) * 100;
}
export const BET_FRACTIONS: { fraction: number; label: string }[] = [
  { fraction: 0.25, label: "팟의 1/4" },
  { fraction: 1 / 3, label: "팟의 1/3" },
  { fraction: 0.5, label: "팟의 1/2" },
  { fraction: 2 / 3, label: "팟의 2/3" },
  { fraction: 0.75, label: "팟의 3/4" },
  { fraction: 1, label: "팟만큼" },
  { fraction: 1.5, label: "팟의 1.5배" },
  { fraction: 2, label: "팟의 2배" },
];

/** 프리플랍 올인 맞대결(앞 패 승률 %, 비김은 반씩) */
export const MATCHUPS: { a: string; b: string; label: string; eqA: number }[] = [
  { a: "AA", b: "KK", label: "큰 페어 vs 작은 페어", eqA: 82.0 },
  { a: "QQ", b: "87s", label: "페어 vs 낮은 두 장", eqA: 78.3 },
  { a: "AKo", b: "AQo", label: "같은 A, 키커 차이(도미네이트)", eqA: 74.2 },
  { a: "88", b: "A7o", label: "페어 vs 높은 카드 1장 + 낮은 1장", eqA: 71.0 },
  { a: "AKo", b: "87s", label: "높은 두 장 vs 낮은 두 장", eqA: 58.9 },
  { a: "QQ", b: "AKo", label: "중간 페어 vs 오버카드 2장", eqA: 56.8 },
  { a: "22", b: "AKo", label: "작은 페어 vs 오버카드 2장(코인 플립)", eqA: 52.6 },
];

/** 족보(7장 중 가장 좋은 5장) 나올 확률 — 딜러 가이드 「홀덤 핸드 순위」와 같은 값 */
export const HAND_FREQ: { name: string; pct: string }[] = [
  { name: "스트레이트 플러시(로열 포함)", pct: "약 0.03%" },
  { name: "포카드", pct: "약 0.17%" },
  { name: "풀하우스", pct: "약 2.6%" },
  { name: "플러시", pct: "약 3.0%" },
  { name: "스트레이트", pct: "약 4.6%" },
  { name: "트리플", pct: "약 4.8%" },
  { name: "투페어", pct: "약 23.5%" },
  { name: "원페어", pct: "약 43.8%" },
  { name: "하이카드", pct: "약 17.4%" },
];
