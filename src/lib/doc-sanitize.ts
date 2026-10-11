import sanitizeHtml from "sanitize-html";
import { looksLikeHtml, textToDocHtml } from "@/lib/doc-html";

/**
 * 문서 본문 HTML을 화면에 넣기 전에 거릅니다(서버 전용).
 * 서식(제목·굵게·빨강·밑줄·표·목록·푸터·이미지)만 남기고 script, on* 속성, javascript: 주소 등은 모두 지웁니다.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "div", "span", "section", "header", "footer",
    "strong", "b", "em", "i", "u", "s", "mark", "small", "sup", "sub", "font", "blockquote",
    "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    "a", "img",
  ],
  allowedAttributes: {
    "*": ["class", "style", "align"],
    a: ["href", "target", "rel", "title"],
    img: ["src", "alt", "width", "height"],
    font: ["color", "size"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
    col: ["span", "width"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  allowedStyles: {
    "*": {
      color: [/^#[0-9a-f]{3,8}$/i, /^[a-z]+$/i, /^rgba?\([\d\s,.%]+\)$/i],
      "background-color": [/^#[0-9a-f]{3,8}$/i, /^[a-z]+$/i, /^rgba?\([\d\s,.%]+\)$/i],
      "font-weight": [/^(normal|bold|bolder|[1-9]00)$/],
      "font-style": [/^(normal|italic)$/],
      "font-size": [/^\d+(\.\d+)?(px|em|rem|%)$/],
      "text-decoration": [/^(none|underline|line-through)( [a-z]+)*$/],
      "text-align": [/^(left|right|center|justify)$/],
      "text-indent": [/^\d+(\.\d+)?(px|em|rem)$/],
      "margin-top": [/^\d+(\.\d+)?(px|em|rem)$/],
      "margin-bottom": [/^\d+(\.\d+)?(px|em|rem)$/],
      "padding-left": [/^\d+(\.\d+)?(px|em|rem)$/],
    },
  },
  // 사이트 내부 이미지(/api/images/…)는 상대 주소로 허용합니다.
  exclusiveFilter: (frame) => frame.tag === "img" && !/^(https?:\/\/|\/api\/images\/)/.test(frame.attribs.src ?? ""),
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow ugc" },
    }),
  },
};

export function sanitizeDocHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}

/** 저장된 본문(일반 글이든 HTML이든)을 종이 문서에 넣을 안전한 HTML로 만듭니다. */
export function contentToDocHtml(content: string): string {
  return sanitizeDocHtml(looksLikeHtml(content) ? content : textToDocHtml(content));
}
