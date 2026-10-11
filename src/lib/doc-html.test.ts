import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { looksLikeHtml, textToDocHtml } from "./doc-html";
import { contentToDocHtml, sanitizeDocHtml } from "./doc-sanitize";

describe("doc html", () => {
  it("일반 글 → 문단·밑줄 소제목·푸터", () => {
    const html = textToDocHtml("머리말 <b>\n둘째 줄\n\n1. 플로어 결정\n플로어의 결정은 최종입니다.\n\n번역: 홍길동\nCopyright © TDA");
    assert.equal(
      html,
      [
        "<p>머리말 &lt;b&gt;<br>둘째 줄</p>",
        '<h3 class="doc-sub">1. 플로어 결정</h3>',
        "<p>플로어의 결정은 최종입니다.</p>",
        "<footer><p>번역: 홍길동</p><p>Copyright © TDA</p></footer>",
      ].join("\n"),
    );
    assert.equal(looksLikeHtml("a < b 그리고 c > d"), false);
    assert.equal(looksLikeHtml('<p class="red">x</p>'), true);
  });

  it("서식은 남기고 위험한 것은 지웁니다", () => {
    const dirty =
      '<h2 style="text-align:center">제목</h2><p class="red" onclick="alert(1)">강조</p><span style="color:red;position:fixed">빨강</span>' +
      '<script>alert(1)</script><img src="x" onerror="alert(1)"><img src="/api/images/abc123"><a href="javascript:alert(1)">나쁜 링크</a>' +
      '<a href="https://tda.org">TDA</a><iframe src="https://evil"></iframe><footer>Copyright</footer>';
    const clean = sanitizeDocHtml(dirty);
    assert.ok(clean.includes('<h2 style="text-align:center">제목</h2>'));
    assert.ok(clean.includes('<p class="red">강조</p>'));
    assert.ok(clean.includes('<span style="color:red">빨강</span>'));
    assert.ok(clean.includes('<img src="/api/images/abc123" />'));
    assert.ok(clean.includes('href="https://tda.org" target="_blank" rel="noopener noreferrer nofollow ugc"'));
    assert.ok(clean.includes("<footer>Copyright</footer>"));
    for (const bad of ["onclick", "<script", "onerror", 'src="x"', "javascript:", "<iframe", "position"]) {
      assert.ok(!clean.includes(bad), bad);
    }
    // 서식 태그가 없으면 일반 글로 보고 글자 그대로(이스케이프) 보여 줍니다.
    assert.equal(contentToDocHtml("<script>alert(1)</script>"), "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });
});
