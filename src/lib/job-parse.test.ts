import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseJobPost } from "./job-parse";

const TODAY = "2026-10-12";
const sample = (name: string) => readFileSync(join(__dirname, "__fixtures__", `job-${name}.txt`), "utf8");

describe("parseJobPost", () => {
  it("대회딜러 구인: RABBIT FESTIVAL", () => {
    const job = parseJobPost(sample("rabbit-festival"), TODAY);
    assert.equal(job.companyName, "RABBIT FESTIVAL");
    assert.equal(job.region, "서울");
    assert.equal(job.address, "구로 G스타디움 · 서울시 구로구 구로중앙로 134 3층");
    assert.equal(job.workDate, "2026-10-31");
    assert.equal(job.endDate, "2026-11-01");
    assert.equal(job.headcount, "100명");
    assert.equal(job.schedule, "MAIN EVENT · 10월 31일 (토) - 65명 / 러너펍 3rd 매장대항전 · 11월 1일 (일) - 35명");
    assert.equal(job.payType, "시급");
    assert.equal(job.payAmount, "20000");
    assert.equal(job.guaranteedHours, "6시간");
    assert.equal(job.workHours, "출근 추후 공지");
    assert.equal(job.benefits, "식사 제공, 주차");
    assert.equal(job.dressCode, "상의 검정 셔츠 · 하의 검정 슬랙스");
    assert.equal(job.experience, "TDA 룰 숙지자, 1년 이상 경력자, 연장 근무 가능자, 샷클락 사용 가능자");
    assert.equal(job.applyMethod, "문자 지원 (행사명/성함/경력/성별/거주지)");
    assert.equal(job.contact, "010-2693-0330");
    assert.equal(job.deadline, null);
    assert.equal(job.alwaysOpen, false);
  });

  it("지원딜러 구인: CHEEZEE, 주소 없이 동네 이름으로 지역 추정", () => {
    const job = parseJobPost(sample("cheezee-ccc"), TODAY);
    assert.equal(job.companyName, "CHEEZEE C.C.C & 매장대항전");
    assert.equal(job.region, "인천");
    assert.equal(job.address, "부평 · 김포");
    assert.equal(job.workDate, "2026-10-24");
    assert.equal(job.endDate, "2026-10-31");
    assert.equal(job.headcount, "26명");
    assert.equal(job.payAmount, "20000");
    assert.equal(job.guaranteedHours, "5시간");
    assert.equal(job.benefits, "식비 10,000원");
    assert.equal(job.dressCode, "상의 검정 카라셔츠 · 하의 검정 슬랙스 · 신발 검정 구두 or 어두운 계열 신발");
    assert.equal(job.applyMethod, "문자 지원 (성함,경력,소속팀,생년월일,근무일)");
    assert.equal(job.contact, "조준우 010-5347-7212");
  });

  it("대회딜러 구인: ACE POKER LEAGUE, 기간·마감·구글폼", () => {
    const job = parseJobPost(sample("ace-poker-league"), TODAY);
    assert.equal(job.companyName, "ACE POKER LEAGUE");
    assert.equal(job.region, "서울");
    assert.equal(job.address, "세종대학교, 서울특별시 광진구 능동로 209");
    assert.equal(job.workDate, "2026-12-23");
    assert.equal(job.endDate, "2026-12-27");
    assert.equal(job.deadline, "2026-12-13");
    assert.equal(job.headcount, "70명+@");
    assert.equal(job.payAmount, "20000");
    assert.equal(job.workHours, "출근 추후 일괄 공지");
    assert.equal(job.benefits, "교통비 매일 1만, 식사 제공");
    assert.equal(job.travelPay, true);
    assert.equal(job.travelPayAmount, "10000");
    assert.equal(job.applyLink, "https://forms.gle/PgF8r4wMjNmAUwxJ8");
    assert.equal(job.applyMethod, "구글폼 지원서");
    assert.equal(job.contact, "김종욱 010-5678-5247");
  });

  it("팀 구인: HAN AGENCY, 상시 모집", () => {
    const job = parseJobPost(sample("han-agency"), TODAY);
    assert.equal(job.companyName, "HAN AGENCY");
    assert.equal(job.region, null);
    assert.equal(job.alwaysOpen, true);
    assert.equal(job.workDate, null);
    assert.equal(job.applyLink, "https://forms.gle/7Agrv8H2Drcx8m2w7");
    assert.equal(
      job.experience,
      "포커 업계에 열정이 많으신 분, 평소 딜러팀에 관심이 있었던 분, 타지역 출장 근무가 용이하신 분",
    );
    assert.equal(job.contact, "김종욱 010-5678-5247, 권순호 010-2693-0330, 문준서 010-7799-0165");
  });

  it("연도 없는 지난 달 날짜는 내년으로 봅니다", () => {
    const job = parseJobPost("【 테스트 】\n• 1월 5일 - 3명", TODAY);
    assert.equal(job.workDate, "2027-01-05");
  });
});
