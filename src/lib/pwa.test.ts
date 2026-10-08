import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PWA_BACKGROUND_COLOR,
  PWA_DISPLAY,
  PWA_ICON_192,
  PWA_ICON_512,
  PWA_NAME,
  PWA_SHORT_NAME,
  PWA_START_URL,
  PWA_THEME_COLOR,
} from "./pwa";
import { MOBILE_BOTTOM_NAV, mobileNavActive } from "./nav";

describe("pwa manifest constants", () => {
  it("matches the POKA standalone app spec", () => {
    assert.equal(PWA_NAME, "POKA - 홀덤·딜러 커뮤니티");
    assert.equal(PWA_SHORT_NAME, "POKA");
    assert.equal(PWA_START_URL, "/");
    assert.equal(PWA_DISPLAY, "standalone");
    assert.equal(PWA_THEME_COLOR, "#07150f");
    assert.equal(PWA_BACKGROUND_COLOR, "#07150f");
    assert.equal(PWA_ICON_192, "/icons/poka-192.png");
    assert.equal(PWA_ICON_512, "/icons/poka-512.png");
  });
});

describe("mobile bottom nav", () => {
  it("covers home, boards, write, suggestions, me", () => {
    const labels = MOBILE_BOTTOM_NAV.map((item) => item.label);
    assert.deepEqual(labels, ["홈", "게시판", "글쓰기", "건의사항", "내정보"]);
  });

  it("highlights suggestions instead of boards", () => {
    const boards = MOBILE_BOTTOM_NAV.find((item) => item.label === "게시판");
    const suggestions = MOBILE_BOTTOM_NAV.find((item) => item.label === "건의사항");
    assert.ok(boards && suggestions);
    assert.equal(mobileNavActive("/boards/suggestions", boards), false);
    assert.equal(mobileNavActive("/boards/suggestions", suggestions), true);
    assert.equal(mobileNavActive("/boards/free", boards), true);
  });
});
