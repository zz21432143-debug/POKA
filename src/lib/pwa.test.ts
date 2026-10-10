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
  it("puts jobs first: home, jobs, job write, boards, me", () => {
    const labels = MOBILE_BOTTOM_NAV.map((item) => item.label);
    assert.deepEqual(labels, ["홈", "구인구직", "구인등록", "게시판", "내정보"]);
    assert.equal(MOBILE_BOTTOM_NAV[4]?.href, "/account");
  });

  it("uses real page hrefs so bottom buttons can navigate", () => {
    assert.equal(MOBILE_BOTTOM_NAV[1]?.href, "/boards/jobs");
    assert.equal(MOBILE_BOTTOM_NAV[2]?.href, "/boards/jobs/write");
    assert.equal(MOBILE_BOTTOM_NAV[3]?.href, "/community");
  });

  it("highlights jobs instead of boards on job pages", () => {
    const boards = MOBILE_BOTTOM_NAV.find((item) => item.label === "게시판");
    const jobs = MOBILE_BOTTOM_NAV.find((item) => item.label === "구인구직");
    const write = MOBILE_BOTTOM_NAV.find((item) => item.label === "구인등록");
    assert.ok(boards && jobs && write);
    assert.equal(mobileNavActive("/boards/jobs/urgent", boards), false);
    assert.equal(mobileNavActive("/boards/jobs/urgent", jobs), true);
    assert.equal(mobileNavActive("/boards/jobs/urgent/write", jobs), false);
    assert.equal(mobileNavActive("/boards/jobs/urgent/write", write), true);
    assert.equal(mobileNavActive("/boards/free", boards), true);
  });
});
