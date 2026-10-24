import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOARD_SECTION, SIDEBAR_NAV, navSectionOf } from "./nav";

// 사이트의 모든 화면 주소 → 메뉴 묶음(위쪽 · 왼쪽 같은 규칙)
const EXPECT: [string, string | null][] = [
  ["/", null],
  // 구인구직
  ["/boards/jobs", "구인구직"],
  ["/boards/jobs/apply", "구인구직"],
  ["/boards/jobs/urgent", "구인구직"],
  ["/boards/jobs/tournament", "구인구직"],
  ["/boards/jobs/fixed", "구인구직"],
  ["/boards/jobs/team", "구인구직"],
  ["/boards/jobs/apply/write", "구인구직"],
  ["/boards/jobs/write", "구인구직"],
  ["/boards/jobs/mine", "구인구직"],
  ["/boards/jobs/available", "구인구직"],
  ["/boards/jobs/slots", "구인구직"],
  ["/jobs/서울", "구인구직"],
  // 매장 관리
  ["/tools", "매장 관리"],
  ["/tools/rotation", "매장 관리"],
  ["/tools/board", "매장 관리"],
  ["/tools/shot-clock", "매장 관리"],
  ["/tools/seat-draw", "매장 관리"],
  ["/tools/pay", "매장 관리"],
  // 홀덤 공부(주소가 /community · /info · /tools 아래여도)
  ["/study", "홀덤 공부"],
  ["/tools/practice", "매장 관리"],
  ["/study/glossary", "홀덤 공부"],
  ["/study/floor-cases", "홀덤 공부"],
  ["/community/equity", "홀덤 공부"],
  ["/community/hand-ranges", "홀덤 공부"],
  ["/community/hand-rankings", "홀덤 공부"],
  ["/info/push-fold", "홀덤 공부"],
  ["/info/icm", "매장 관리"],
  ["/study/cheatsheet", "매장 관리"],
  ["/info/guide", "홀덤 공부"],
  ["/info/guide/side-pots", "홀덤 공부"],
  ["/info/holdem", "홀덤 공부"],
  ["/info/holdem/position", "홀덤 공부"],
  ["/boards/tda", "홀덤 공부"],
  ["/quiz", "홀덤 공부"],
  ["/quiz/2026-10-19", "홀덤 공부"],
  // 커뮤니티
  ["/community", "커뮤니티"],
  ["/boards/free", "커뮤니티"],
  ["/boards/free/write", "커뮤니티"],
  ["/boards/rules", "커뮤니티"],
  ["/boards/rules/write", "커뮤니티"],
  ["/boards/hand-review", "커뮤니티"],
  ["/boards/hand-review/write", "커뮤니티"],
  ["/boards/schedule", "커뮤니티"],
  ["/boards/sketch", "커뮤니티"],
  ["/info", "커뮤니티"],
  ["/u/홍길동", "커뮤니티"],
  ["/search", "커뮤니티"],
  // 포인트 · 놀이
  ["/play", "포인트 · 놀이"],
  ["/attendance", "포인트 · 놀이"],
  ["/yokai", "포인트 · 놀이"],
  ["/games", "포인트 · 놀이"],
  ["/games/omok/ai", "포인트 · 놀이"],
  ["/games/yut", "포인트 · 놀이"],
  ["/ranking", "포인트 · 놀이"],
  ["/shop", "포인트 · 놀이"],
  ["/invite", "포인트 · 놀이"],
  ["/i/ABC123", "포인트 · 놀이"],
  // POKA
  ["/poka", "POKA"],
  ["/notices", "POKA"],
  ["/notices/write", "POKA"],
  ["/boards/official", "POKA"],
  ["/boards/official/write", "POKA"],
  ["/boards/promo/write", "POKA"],
  ["/boards/suggestions", "POKA"],
  ["/advertise", "POKA"],
  ["/about", "POKA"],
  ["/operator", "POKA"],
  ["/contact", "POKA"],
  ["/terms", "POKA"],
  ["/privacy", "POKA"],
  ["/youth", "POKA"],
  ["/info/dealers", "POKA"],
  // 메뉴 밖(내 정보 · 로그인 · 관리자 · 공유 화면)
  ["/account", null],
  ["/me", null],
  ["/login", null],
  ["/signup", null],
  ["/admin", null],
  ["/r/abc", null],
  ["/g/abc", null],
];

describe("메뉴 묶음: 모든 화면이 올바른 메뉴에", () => {
  for (const [path, want] of EXPECT) {
    it(`${path} → ${want ?? "(없음)"}`, () => {
      assert.equal(navSectionOf(path), want);
    });
  }
  it("게시글은 게시판 종류로 묶음을 정함(모든 게시판 종류)", () => {
    const titles = new Set(SIDEBAR_NAV.map((g) => g.title));
    for (const type of ["FREE", "RULE_QA", "SKETCH", "HAND_REVIEW", "ANONYMOUS_REVIEW", "JOBS", "PROMO", "EVENT_POSTER", "OFFICIAL_POSTER", "TALENT", "PICKUP", "SCHEDULE", "NOTICE", "SUGGESTION", "TDA"] as const) {
      assert.ok(titles.has(BOARD_SECTION[type] ?? ""), type);
    }
    assert.equal(navSectionOf("/posts/abc", "구인구직"), "구인구직");
  });
});
