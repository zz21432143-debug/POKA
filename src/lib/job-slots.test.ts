import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openSlots, readTime, slotsFromText } from "./job-slots";

const KAKAO = `🌴 야자수 홀덤 🌴

• 잠실 방이점
10월 18일 (일) PM 2:00 - 2명
10월 24일 (토) PM 2:00 - 4명

• 하남 미사점
10월 20일 (화) PM 5:00 - 1명 마감
10월 23일 (금) PM 5:00 - 3명

시급 20,000 (5시간 보장)
010 5886 2226`;

describe("job slots", () => {
  it("reads times", () => {
    assert.equal(readTime(" PM 2:00 - 2명"), "14:00");
    assert.equal(readTime("오후 6시 1명"), "18:00");
    assert.equal(readTime(" 18:30 2명"), "18:30");
    assert.equal(readTime(" 2명"), null);
  });

  it("splits a Kakao job post into slots with branches", () => {
    const s = slotsFromText(KAKAO, "2026-10-16");
    assert.equal(s.length, 4);
    assert.deepEqual(s[0], { date: "2026-10-18", time: "14:00", count: "2명", branch: "잠실 방이점", closed: false });
    assert.equal(s[2].branch, "하남 미사점");
    assert.equal(s[2].closed, true);
    assert.equal(s[3].count, "3명");
  });

  it("keeps only open future slots", () => {
    const open = openSlots({ content: KAKAO }, "2026-10-21");
    assert.deepEqual(open.map((x) => x.date), ["2026-10-23", "2026-10-24"]);
  });

  it("falls back to event rows and work date", () => {
    const ev = openSlots({ content: "상세는 연락", jobEvents: JSON.stringify([{ date: "2026-11-05", name: "KPT", headcount: "20" }]) }, "2026-10-16");
    assert.deepEqual(ev, [{ date: "2026-11-05", time: null, count: "20명", branch: "KPT", closed: false }]);
    const urgent = openSlots({ content: "오늘 급구", jobWorkDate: "2026-10-16", jobWorkHours: "오후 7시~" }, "2026-10-16");
    assert.equal(urgent[0].time, "19:00");
  });
});
