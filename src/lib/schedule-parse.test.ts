import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseScheduleText } from "./schedule-parse";

const TODAY = "2026-10-12";
const pick = (text: string) => {
  const p = parseScheduleText(text, TODAY);
  return { title: p.title, startDate: p.startDate, endDate: p.endDate, totalPrize: p.totalPrize, location: p.location };
};

describe("schedule text parse (자동 나누기)", () => {
  it("여러 줄 · 머리말 있음", () => {
    const text = [
      "【 POKA 홀덤 챔피언십 2026 】",
      "",
      "📅 일시 : 2026.11.14(토) - 11.16(월)",
      "📍 장소 : POKA호텔 3층 베리언스 룸",
      "🏆 총상금 : GTD 3억",
      "바이인 330,000원",
      "참가 신청 마감 : 11월 10일",
      "https://poka.example/champ",
    ].join("\n");
    assert.deepEqual(pick(text), {
      title: "POKA 홀덤 챔피언십 2026",
      startDate: "2026-11-14",
      endDate: "2026-11-16",
      totalPrize: "GTD 3억",
      location: "POKA호텔 3층 베리언스 룸",
    });
    const p = parseScheduleText(text, TODAY);
    assert.equal(p.link, "https://poka.example/champ");
    assert.ok(p.description.includes("바이인 330,000원"));
  });

  it("여러 줄 · 머리말 없음", () => {
    assert.deepEqual(
      pick(["서울 위클리 홀덤 토너먼트", "참가 접수 10/20까지", "12월 5일 ~ 12월 7일", "서울시 강남구 테헤란로 123 5층", "보장 상금 5,000만원"].join("\n")),
      {
        title: "서울 위클리 홀덤 토너먼트",
        startDate: "2026-12-05",
        endDate: "2026-12-07",
        totalPrize: "5,000만원",
        location: "서울시 강남구 테헤란로 123 5층",
      },
    );
  });

  it("한 줄 · 구분 없이 이어 붙인 글", () => {
    assert.deepEqual(pick("POKA 윈터 시리즈 2026.12.18~12.20 POKA호텔 3층 베리언스 룸 GTD 1억"), {
      title: "POKA 윈터 시리즈",
      startDate: "2026-12-18",
      endDate: "2026-12-20",
      totalPrize: "GTD 1억",
      location: "POKA호텔 3층 베리언스 룸",
    });
  });

  it("한 줄 · 머리말과 | 구분", () => {
    assert.deepEqual(pick("대회명: 서울 위클리 | 일시: 12/5~12/7 | 장소: 서울시 강남구 테헤란로 123 | 총상금: 5,000만원"), {
      title: "서울 위클리",
      startDate: "2026-12-05",
      endDate: "2026-12-07",
      totalPrize: "5,000만원",
      location: "서울시 강남구 테헤란로 123",
    });
  });

  it("한 줄 · [대회명] 날짜, 주소, 총상금", () => {
    assert.deepEqual(pick("[KPT 2026] 11월 21일 ~ 23일, 서울특별시 강남구 테헤란로 521 파르나스호텔, 총상금 3억원"), {
      title: "KPT 2026",
      startDate: "2026-11-21",
      endDate: "2026-11-23",
      totalPrize: "3억원",
      location: "서울특별시 강남구 테헤란로 521 파르나스호텔",
    });
  });

  it("하루짜리 · 연도 넘어가는 날짜", () => {
    assert.deepEqual(pick("대회명: 원데이 컵\n날짜: 1/3"), {
      title: "원데이 컵",
      startDate: "2027-01-03",
      endDate: "2027-01-03",
      totalPrize: "",
      location: "",
    });
  });
});
