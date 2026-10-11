import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePosterAnswer } from "./poster-analyze";

describe("poster analyze", () => {
  it("응답 글 속 JSON을 꺼내 칸을 정리합니다", () => {
    const fields = normalizePosterAnswer(
      '분석 결과입니다.\n{"title":"POKA 홀덤 챔피언십","location":"POKA호텔 3층","startDate":"2026-11-14","endDate":"2026-11-13","totalPrize":"GTD 3억","description":"DAY1 11/14","link":"poka.kr"}',
    );
    assert.deepEqual(fields, {
      title: "POKA 홀덤 챔피언십",
      location: "POKA호텔 3층",
      startDate: "2026-11-14",
      endDate: "2026-11-14",
      totalPrize: "GTD 3억",
      description: "DAY1 11/14",
      link: "",
    });
  });

  it("날짜 형식이 틀리거나 JSON이 없으면 비웁니다", () => {
    assert.equal(normalizePosterAnswer("읽을 수 없습니다"), null);
    const fields = normalizePosterAnswer('{"title":"A","startDate":"11월 14일","link":"https://poka.kr/e"}');
    assert.equal(fields?.startDate, "");
    assert.equal(fields?.endDate, "");
    assert.equal(fields?.link, "https://poka.kr/e");
  });
});
