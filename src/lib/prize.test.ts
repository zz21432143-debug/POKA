import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prizeToWon, shortWon } from "./prize";
import { SCHEDULE_PALETTE, assignScheduleColors } from "./schedule-colors";

describe("prize", () => {
  it("상금 글 → 원", () => {
    assert.equal(prizeToWon("GTD 3억"), 300_000_000);
    assert.equal(prizeToWon("총상금 1.5억"), 150_000_000);
    assert.equal(prizeToWon("3억 5천만원"), 350_000_000);
    assert.equal(prizeToWon("5,000만원"), 50_000_000);
    assert.equal(prizeToWon("5천만"), 50_000_000);
    assert.equal(prizeToWon("₩300,000,000"), 300_000_000);
    assert.equal(prizeToWon("300만 GTD"), 3_000_000);
    assert.equal(prizeToWon(""), 0);
    assert.equal(prizeToWon("미정"), 0);
  });

  it("짧은 표기", () => {
    assert.equal(shortWon(300_000_000), "3억");
    assert.equal(shortWon(150_000_000), "1.5억");
    assert.equal(shortWon(50_000_000), "5천만");
    assert.equal(shortWon(3_500_000), "350만");
    assert.equal(shortWon(0), "");
  });
});

describe("schedule colors", () => {
  it("대회마다 다른 색, 같은 이름은 같은 색", () => {
    const events = Array.from({ length: 8 }, (_, i) => ({ title: `대회${i}`, eventDate: `2026-11-${String(i + 1).padStart(2, "0")}` }));
    const colors = assignScheduleColors([...events, { title: "대회3", eventDate: "2026-11-20" }]);
    const values = events.map((e) => colors.get(e.title.toLowerCase()));
    assert.equal(new Set(values).size, 8);
    assert.ok(values.every((v) => SCHEDULE_PALETTE.includes(v as (typeof SCHEDULE_PALETTE)[number])));
    assert.equal(colors.size, 8);
  });
});
