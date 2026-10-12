import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { postTickerMessage, tickerTitle, withCurrentTitle } from "./ticker-text";

describe("ticker text", () => {
  it("keeps up to 80 characters of the title", () => {
    assert.equal(tickerTitle("짧은 제목"), "짧은 제목");
    const long = "가".repeat(100);
    assert.equal(tickerTitle(long).length, 80);
    assert.ok(tickerTitle(long).endsWith("…"));
  });

  it("puts the title first with a short board tag", () => {
    assert.equal(
      postTickerMessage("POKA", "핸드리뷰", "홀덤 핸드리뷰 | BTN vs BB AJs 3벳팟, 리버 올인에 콜할까?"),
      "📝 [핸드리뷰] BTN vs BB AJs 3벳팟, 리버 올인에 콜할까? · POKA",
    );
  });

  it("rewrites old long messages into the short form with the current title", () => {
    const old = "📝 POKA님이 [핸드리뷰]에 글을 남겼습니다 — 홀덤 핸드리뷰 | BTN vs BB AJs 3벳팟,";
    assert.equal(
      withCurrentTitle(old, "홀덤 핸드리뷰 | BTN vs BB AJs 3벳팟, 리버 올인에 콜할까?"),
      "📝 [핸드리뷰] BTN vs BB AJs 3벳팟, 리버 올인에 콜할까? · POKA",
    );
    const fresh = postTickerMessage("딜러킴", "자유게시판", "옛 제목");
    assert.equal(withCurrentTitle(fresh, "고친 제목"), "📝 [자유게시판] 고친 제목 · 딜러킴");
    assert.equal(
      withCurrentTitle("⭐ 딜러킴님의 [옛 제목]이 인기 게시물로 선정되었습니다!", "새 제목", "POPULAR"),
      "⭐ 인기글 새 제목 · 딜러킴",
    );
    assert.equal(withCurrentTitle("🎉 POKA님이 Lv.6을 달성하셨습니다!", "x"), "🎉 POKA님이 Lv.6을 달성하셨습니다!");
  });
});
