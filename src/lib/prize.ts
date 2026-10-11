/**
 * 총상금 글("GTD 3억", "3억 5천만원", "5,000만원", "₩300,000,000", "1.5억")을 원 단위 숫자로 바꿉니다.
 * 대회 캘린더에서 같은 날 대회를 상금 큰 순서로 세울 때 씁니다. 못 읽으면 0.
 */
export function prizeToWon(text: string | null | undefined): number {
  const s = (text ?? "").replace(/\s+/g, "").replace(/,/g, "");
  if (!s) return 0;
  // 억 단위: 3억, 3.5억, 3억5천만, 3억5000만
  const eok = s.match(/(\d+(?:\.\d+)?)억(?:(\d+)천(?:만)?)?(?:(\d+)만)?/);
  if (eok) {
    return Math.round(Number(eok[1]) * 1e8 + (eok[2] ? Number(eok[2]) * 1e7 : 0) + (eok[3] ? Number(eok[3]) * 1e4 : 0));
  }
  // 천만 단위: 5천만
  const cheonman = s.match(/(\d+(?:\.\d+)?)천만/);
  if (cheonman) return Math.round(Number(cheonman[1]) * 1e7);
  // 만 단위: 5000만, 300만
  const man = s.match(/(\d+(?:\.\d+)?)만/);
  if (man) return Math.round(Number(man[1]) * 1e4);
  // 숫자 그대로: ₩300000000, 300000000원
  const plain = s.match(/\d{4,}/g);
  if (plain) return Math.max(...plain.map(Number));
  return 0;
}

/** 캘린더 칸 옆에 붙이는 짧은 상금 표기: 300000000 → "3억", 50000000 → "5천만", 3500000 → "350만" */
export function shortWon(won: number): string {
  if (won <= 0) return "";
  if (won >= 1e8) {
    const eok = won / 1e8;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1).replace(/\.0$/, "")}억`;
  }
  if (won >= 1e7 && won % 1e7 === 0) return `${won / 1e7}천만`;
  return `${Math.round(won / 1e4).toLocaleString("ko-KR")}만`;
}
