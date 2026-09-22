import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FEED_BY_HREF, PAGE_SIZE, feedWhere, parseFeedKey } from "./feed";
import { flattenNavItems, BOARD_NAV } from "./nav";
import { ATTENDANCE_LINES, SEED_PER_BOARD, catalogPosts, seedCountByFeed } from "./seed-catalog";

describe("board feed keys", () => {
  it("maps every sidebar href to a feed key", () => {
    for (const item of flattenNavItems()) {
      assert.ok(FEED_BY_HREF[item.href], `missing feed key for ${item.href}`);
    }
  });

  it("rejects unknown keys", () => {
    assert.equal(parseFeedKey("nope"), null);
    assert.equal(parseFeedKey("rules"), "rules");
    assert.equal(parseFeedKey("jobs/seek"), "jobs/seek");
  });

  it("filters jobs by kind", () => {
    assert.deepEqual(feedWhere("jobs/urgent"), {
      boardType: "JOBS",
      jobKind: "URGENT",
      hidden: false,
      isAttendanceThread: false,
    });
  });

  it("uses gold dots only on jobs, emerald elsewhere", () => {
    for (const group of BOARD_NAV) {
      if (group.href.startsWith("/boards/jobs")) {
        assert.equal(group.accent, "gold");
      } else {
        assert.equal(group.accent, "emerald");
      }
    }
  });

  it("keeps page size at 10 for infinite scroll", () => {
    assert.equal(PAGE_SIZE, 10);
  });

  it("strips emoji from nav copy", () => {
    const emoji = /[\u{1F300}-\u{1FAFF}]/u;
    for (const group of BOARD_NAV) {
      assert.equal(emoji.test(group.title), false, group.title);
      for (const item of group.items) {
        assert.equal(emoji.test(item.label), false, item.label);
      }
    }
  });
});

describe("seed catalog", () => {
  it("has 20 items per board and 20 attendance lines", () => {
    const counts = seedCountByFeed(catalogPosts("2026-09-22"));
    for (const [key, count] of Object.entries(counts)) {
      assert.equal(count, SEED_PER_BOARD, `${key} should have ${SEED_PER_BOARD}`);
    }
    assert.equal(ATTENDANCE_LINES.length, SEED_PER_BOARD);
  });

  it("uses distinct titles inside each board", () => {
    const catalog = catalogPosts("2026-09-22");
    for (const [key, rows] of Object.entries(catalog)) {
      const titles = rows.map((row) => row.title);
      assert.equal(new Set(titles).size, titles.length, `${key} has duplicate titles`);
    }
  });
});
