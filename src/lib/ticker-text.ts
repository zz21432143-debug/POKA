/** 전광판에 넣는 글 제목 길이. PC에서는 한 줄, 휴대폰에서는 두 줄까지 보입니다. */
export const TICKER_TITLE_MAX = 80;

export function tickerTitle(title: string) {
  const clean = title.replace(/\s+/g, " ").trim();
  return clean.length > TICKER_TITLE_MAX ? `${clean.slice(0, TICKER_TITLE_MAX - 1)}…` : clean;
}

/** 핸드리뷰 글 제목 앞에 자동으로 붙는 말머리(게시판 표시와 겹쳐서 전광판에서는 뺍니다) */
const HAND_PREFIX = /^홀덤\s*핸드리뷰\s*\|\s*/;

/**
 * 새 글 소식: 제목을 앞에 두고 짧게. "📝 [핸드리뷰] 제목 · 닉네임"
 * (예전: "📝 닉네임님이 [핸드리뷰]에 글을 남겼습니다 — 제목" 은 앞부분이 길어 제목이 잘렸음)
 */
export function postTickerMessage(nickname: string, board: string, title: string) {
  return `📝 [${board}] ${tickerTitle(title.replace(HAND_PREFIX, ""))} · ${nickname}`;
}

/** 인기글 소식: "⭐ 인기글 제목 · 닉네임" */
export function popularTickerMessage(nickname: string, title: string) {
  return `⭐ 인기글 ${tickerTitle(title.replace(HAND_PREFIX, ""))} · ${nickname}`;
}

const OLD_POST = /^\S*\s*(.+?)님이 \[(.+?)\]에 글을 남겼습니다/;
const NEW_POST = /^📝 \[(.+?)\] .* · (.+)$/;
const OLD_POPULAR = /^\S*\s*(.+?)님의 \[/;
const NEW_POPULAR = /^⭐ 인기글 .* · (.+)$/;

/** 저장된 글·인기글 소식을 지금 글 제목으로 다시 씁니다(예전 긴 문구도 짧은 형식으로). 모르는 형식이면 그대로 둡니다. */
export function withCurrentTitle(message: string, title: string, kind: "POST" | "POPULAR" = "POST") {
  if (kind === "POPULAR") {
    const nick = NEW_POPULAR.exec(message)?.[1] ?? OLD_POPULAR.exec(message)?.[1];
    return nick ? popularTickerMessage(nick, title) : message;
  }
  const fresh = NEW_POST.exec(message);
  if (fresh) return postTickerMessage(fresh[2], fresh[1], title);
  const old = OLD_POST.exec(message);
  if (old) return postTickerMessage(old[1], old[2], title);
  return message;
}
