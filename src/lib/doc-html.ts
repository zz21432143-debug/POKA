import { isRuleHeading } from "@/lib/tda";

/**
 * 공지·TDA 룰 "종이 문서" 보기용 본문 변환.
 * 본문에 HTML 태그가 있으면 HTML로(서버에서 doc-sanitize로 안전하게 거른 뒤), 없으면 일반 글을 문단 HTML로 바꿉니다.
 */
const HTML_TAG_RE = /<\/?(p|h[1-6]|div|span|strong|b|em|i|u|s|br|hr|table|thead|tbody|tr|th|td|ul|ol|li|blockquote|footer|header|section|mark|small|sup|sub|a|img|font)\b[^>]*>/i;

export function looksLikeHtml(text: string) {
  return HTML_TAG_RE.test(text);
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function linkify(escaped: string) {
  return escaped.replace(
    /(https?:\/\/[^\s<>"')\]]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer nofollow ugc">$1</a>',
  );
}

/**
 * 일반 글 → 문서 HTML.
 * - 빈 줄로 문단을 나눕니다.
 * - "1.", "제3조", "Rule 4"로 시작하는 줄은 밑줄 소제목(h3.doc-sub)이 됩니다.
 * - "Copyright", "©", "번역", "검수"로 시작하는 마지막 줄들은 문서 맨 아래 푸터로 모읍니다.
 */
export function textToDocHtml(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const footer: string[] = [];
  while (lines.length > 0) {
    const last = lines[lines.length - 1].trim();
    if (!last) {
      lines.pop();
      continue;
    }
    if (/^(copyright|ⓒ|©|\(c\)|번역|검수|감수|translated|reviewed)/i.test(last)) {
      footer.unshift(lines.pop()!.trim());
      continue;
    }
    break;
  }
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length > 0) out.push(`<p>${para.join("<br>")}</p>`);
    para = [];
  };
  for (const line of lines) {
    if (!line.trim()) {
      flush();
      continue;
    }
    const safe = linkify(escapeHtml(line.trim()));
    if (isRuleHeading(line)) {
      flush();
      out.push(`<h3 class="doc-sub">${safe}</h3>`);
    } else {
      para.push(safe);
    }
  }
  flush();
  if (footer.length > 0) {
    out.push(`<footer>${footer.map((f) => `<p>${escapeHtml(f)}</p>`).join("")}</footer>`);
  }
  return out.join("\n");
}
