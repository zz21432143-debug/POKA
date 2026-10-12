import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tickerTitle, withCurrentTitle } from "./ticker-text";

describe("ticker text", () => {
  it("keeps up to 80 characters of the title", () => {
    assert.equal(tickerTitle("짧은 제목"), "짧은 제목");
    const long = "가".repeat(100);
    assert.equal(tickerTitle(long).length, 80);
    assert.ok(tickerTitle(long).endsWith("…"));
  });

  it("rebuilds old cut messages with the current title", () => {
    const old = "📝 POKA님이 [핸드리뷰]에 글을 남겼습니다 — 홀덤 핸드리뷰 | BTN vs BB AJs 3벳팟,";
    assert.equal(
      withCurrentTitle(old, "홀덤 핸드리뷰 | BTN vs BB AJs 3벳팟, 리버 올인에 콜할까?"),
      "📝 POKA님이 [핸드리뷰]에 글을 남겼습니다 — 홀덤 핸드리뷰 | BTN vs BB AJs 3벳팟, 리버 올인에 콜할까?",
    );
    assert.equal(withCurrentTitle("⭐ 이벤트", "x"), "⭐ 이벤트");
  });
});
