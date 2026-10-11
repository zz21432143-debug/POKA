import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  eventsDateLabel,
  eventsHeadcountTotal,
  eventsScheduleLines,
  normalizeJobEvents,
  parseJobEvents,
  serializeJobEvents,
} from "./job-events";
import { jobFieldsFromBody } from "./job-fields";

describe("job events", () => {
  it("정리: 날짜 순, 잘못된 날짜·중복 제거", () => {
    const events = normalizeJobEvents([
      { date: "2026-10-31", name: "MAIN EVENT", headcount: "65명" },
      { date: "bad" },
      { date: "2026-10-24" },
      { date: "2026-10-31", name: "MAIN EVENT" },
      "nope",
    ]);
    assert.deepEqual(events, [{ date: "2026-10-24" }, { date: "2026-10-31", name: "MAIN EVENT", headcount: "65명" }]);
    assert.deepEqual(parseJobEvents(serializeJobEvents(events)), events);
    assert.deepEqual(parseJobEvents("{broken"), []);
  });

  it("이어진 같은 행사는 한 줄로 묶습니다", () => {
    const ace = ["2026-12-23", "2026-12-24", "2026-12-25"].map((date) => ({ date }));
    assert.equal(eventsDateLabel(ace), "12/23~12/25");
    assert.deepEqual(eventsScheduleLines(ace), ["12/23(수)~12/25(금)"]);
    const rabbit = [
      { date: "2026-10-31", name: "MAIN EVENT", headcount: "65명" },
      { date: "2026-11-01", name: "매장대항전", headcount: "35명" },
    ];
    assert.equal(eventsDateLabel(rabbit), "10/31~11/1");
    assert.equal(eventsDateLabel([{ date: "2026-10-24" }, { date: "2026-10-31" }]), "10/24·10/31");
    assert.deepEqual(eventsScheduleLines(rabbit), ["MAIN EVENT · 10/31(토) · 65명", "매장대항전 · 11/1(일) · 35명"]);
    assert.equal(eventsHeadcountTotal(rabbit), "100명");
    const many = ["2026-10-01", "2026-10-03", "2026-10-05", "2026-10-07"].map((date) => ({ date }));
    assert.equal(eventsDateLabel(many), "10/1 외 3일");
  });

  it("글 저장: 첫날·마지막 날·제목·인원 합계를 일정에서 만듭니다", () => {
    const data = jobFieldsFromBody(
      {
        jobLocation: "서울 POKA호텔 3층 베리언스 룸",
        jobCompanyName: "POKA 홀덤 대회",
        jobPayAmount: "20000",
        jobEvents: [
          { date: "2026-11-15", name: "SIDE EVENT", headcount: "20명" },
          { date: "2026-11-14", name: "MAIN EVENT", headcount: "40명" },
        ],
      },
      "TOURNAMENT",
    );
    assert.equal(data.jobWorkDate, "2026-11-14");
    assert.equal(data.jobEndDate, "2026-11-15");
    assert.equal(data.title, "[서울] POKA 홀덤 대회 대회딜러 구인 (11/14~11/15)");
    assert.equal(data.jobHeadcount, "60명");
    assert.equal(data.jobSchedule, "MAIN EVENT · 11/14(토) · 40명 / SIDE EVENT · 11/15(일) · 20명");
    const later = jobFieldsFromBody({ jobEvents: [{ date: "2026-11-14" }], jobDateFlexible: true }, "TOURNAMENT");
    assert.equal(later.jobEvents, null);
    assert.equal(later.jobWorkDate, null);
  });
});
