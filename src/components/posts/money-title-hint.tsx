/**
 * 제목에 상금 · 금액이 들어가면 살짝 알려 줌(막지는 않음).
 * 홈 · 목록에 「총상금 4억」 같은 글자가 크게 보이면 애드센스가 도박 관련으로 볼 수 있어서.
 */
const MONEY_RE = /(총?상금|보장\s*상금|\d[\d,.]*\s*(억|천만|백만|만\s*원|만원)|\d[\d,.]*\s*만\s*(gtd|보장)|\d{1,3}(,\d{3}){2,})/i;

export function hasMoneyInTitle(title: string) {
  return MONEY_RE.test(title);
}

export function MoneyTitleHint({ title }: { title: string }) {
  if (!hasMoneyInTitle(title)) return null;
  return (
    <p data-money-title-hint className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
      💡 제목에 상금 · 금액이 있어요. 홈 · 목록에 크게 보이면 광고 심사(애드센스)에서 도박 관련으로 볼 수 있어요. 금액은 본문이나 포스터에만 넣고, 제목은 대회 이름 위주로
      쓰는 걸 추천해요. (그대로 올려도 돼요)
    </p>
  );
}
