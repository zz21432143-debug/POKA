/** 전광판에 넣는 글 제목 길이(예전 28자 → 80자). PC에서는 한 줄, 휴대폰에서는 두 줄까지 보입니다. */
export const TICKER_TITLE_MAX = 80;

export function tickerTitle(title: string) {
  const clean = title.replace(/\s+/g, " ").trim();
  return clean.length > TICKER_TITLE_MAX ? `${clean.slice(0, TICKER_TITLE_MAX - 1)}…` : clean;
}

/** "📝 닉님이 [게시판]에 글을 남겼습니다 — 제목" 의 제목 부분을 지금 글 제목으로 바꿉니다. */
export function withCurrentTitle(message: string, title: string) {
  const at = message.indexOf(" — ");
  return at < 0 ? message : `${message.slice(0, at)} — ${tickerTitle(title)}`;
}
