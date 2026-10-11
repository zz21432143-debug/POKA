import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseScheduleText } from "./schedule-parse";

const TODAY = "2026-10-12";

describe("schedule text parse", () => {
  it("머리말이 있는 안내 글", () => {
    const p = parseScheduleText(
      [
        "【 POKA 홀덤 챔피언십 2026 】",
        "",
        "📅 일시 : 2026.11.14(토) - 11.16(월)",
        "📍 장소 : POKA호텔 3층 베리언스 룸",
        "🏆 총상금 : GTD 3억",
        "바이인 330,000원",
        "참가 신청 마감 : 11월 10일",
        "https://poka.example/champ",
      ].join("\n"),
      TODAY,
    );
    assert.equal(p.title, "POKA 홀덤 챔피언십 2026");
    assert.equal(p.startDate, "2026-11-14");
    assert.equal(p.endDate, "2026-11-16");
    assert.equal(p.location, "POKA호텔 3층 베리언스 룸");
    assert.equal(p.totalPrize, "GTD 3억");
    assert.equal(p.link, "https://poka.example/champ");
    assert.ok(p.description.includes("바이인 330,000원"));
  });

  it("머리말 없는 글: 첫 줄 대회명, 날짜·상금·주소 줄 찾기", () => {
    const p = parseScheduleText(
      ["서울 위클리 홀덤 토너먼트", "참가 접수 10/20까지", "12월 5일 ~ 12월 7일", "서울시 강남구 테헤란로 123 5층", "보장 상금 5,000만원"].join("\n"),
      TODAY,
    );
    assert.equal(p.title, "서울 위클리 홀덤 토너먼트");
    assert.equal(p.startDate, "2026-12-05");
    assert.equal(p.endDate, "2026-12-07");
    assert.equal(p.location, "서울시 강남구 테헤란로 123 5층");
    assert.equal(p.totalPrize, "보장 상금 5,000만원");
  });

  it("하루짜리 대회는 종료일 = 시작일", () => {
    const p = parseScheduleText("대회명: 원데이 컵\n날짜: 11/1", TODAY);
    assert.equal(p.title, "원데이 컵");
    assert.equal(p.startDate, "2026-11-01");
    assert.equal(p.endDate, "2026-11-01");
  });
});
