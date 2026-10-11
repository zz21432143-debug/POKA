import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JOB_EXPIRE_DAYS, jobExpiresOn, jobStatus, parseJobRegion } from "./job-status";
import { buildJobTitle, titleRegion } from "./jobs";

const now = new Date("2026-10-11T03:00:00Z");
const today = "2026-10-11";
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe("job status", () => {
  it("marks filled posts as filled first", () => {
    assert.equal(
      jobStatus({ jobKind: "FIXED", jobFilled: true, jobWorkDate: null, createdAt: daysAgo(1) }, now, today),
      "filled",
    );
  });

  it("expires urgent posts after the work date", () => {
    const base = { jobKind: "URGENT", jobFilled: false, createdAt: daysAgo(1) };
    assert.equal(jobStatus({ ...base, jobWorkDate: "2026-10-11" }, now, today), "open");
    assert.equal(jobStatus({ ...base, jobWorkDate: "2026-10-10" }, now, today), "expired");
  });

  it("expires undated urgent posts after a week", () => {
    const base = { jobKind: "URGENT", jobFilled: false, jobWorkDate: null };
    assert.equal(jobStatus({ ...base, createdAt: daysAgo(6) }, now, today), "open");
    assert.equal(jobStatus({ ...base, createdAt: daysAgo(8) }, now, today), "expired");
  });

  it("expires regular posts after 30 days unless always open", () => {
    const base = { jobKind: "FIXED", jobFilled: false, jobWorkDate: null };
    assert.equal(jobStatus({ ...base, createdAt: daysAgo(JOB_EXPIRE_DAYS - 1) }, now, today), "open");
    assert.equal(jobStatus({ ...base, createdAt: daysAgo(JOB_EXPIRE_DAYS + 1) }, now, today), "expired");
    assert.equal(
      jobStatus({ ...base, jobAlwaysOpen: true, createdAt: daysAgo(90) }, now, today),
      "open",
    );
  });

  it("closes multi-day tournaments after the last day", () => {
    const base = { jobKind: "TOURNAMENT", jobFilled: false, createdAt: daysAgo(1), jobWorkDate: "2026-10-10" };
    assert.equal(jobStatus({ ...base, jobEndDate: "2026-10-11" }, now, today), "open");
    assert.equal(jobStatus({ ...base, jobEndDate: null }, now, today), "expired");
  });

  it("closes dated apply posts by their date, not 30 days", () => {
    const base = { jobKind: "APPLY", jobFilled: false, createdAt: daysAgo(1) };
    assert.equal(jobStatus({ ...base, jobWorkDate: "2026-10-10" }, now, today), "expired");
    assert.equal(jobStatus({ ...base, jobWorkDate: "2026-12-01" }, now, today), "open");
  });

  it("closes any post once the application deadline has passed", () => {
    const base = { jobKind: "TOURNAMENT", jobFilled: false, createdAt: daysAgo(1), jobWorkDate: "2026-12-23" };
    assert.equal(jobStatus({ ...base, jobDeadline: "2026-10-11" }, now, today), "open");
    assert.equal(jobStatus({ ...base, jobDeadline: "2026-10-10" }, now, today), "expired");
    assert.equal(jobStatus({ ...base, jobKind: "TEAM", jobAlwaysOpen: true, jobDeadline: "2026-10-10" }, now, today), "expired");
    assert.equal(
      jobExpiresOn({ ...base, jobEndDate: "2026-12-27", jobDeadline: "2026-12-13" }),
      "2026-12-13",
    );
  });

  it("reports the auto-close date", () => {
    assert.equal(
      jobExpiresOn({ jobKind: "FIXED", jobFilled: false, jobWorkDate: null, createdAt: "2026-10-01T03:00:00Z" }),
      "2026-10-31",
    );
    assert.equal(
      jobExpiresOn({ jobKind: "URGENT", jobFilled: false, jobWorkDate: "2026-10-12", createdAt: now }),
      "2026-10-12",
    );
  });

  it("keeps the detailed address out of job titles", () => {
    assert.equal(titleRegion("서울 강남구 테헤란로 123"), "서울");
    assert.equal(titleRegion("분당 정자동"), "분당");
    assert.equal(titleRegion(""), "미정");
    assert.equal(
      buildJobTitle("FIXED", { location: "서울 강남구 테헤란로 123", companyName: "POKA홀덤" }),
      "[서울] POKA홀덤",
    );
    assert.equal(
      buildJobTitle("URGENT", { location: "부산 서면", companyName: "에이스펍", workDate: "2026-10-12" }),
      "[부산] 에이스펍 급구/대타 (2026-10-12)",
    );
    assert.equal(
      buildJobTitle("APPLY", { location: "경기 분당", companyName: "킹스펍", payAmount: "20000" }),
      "[경기] 킹스펍 지원딜러 (시급 20,000원)",
    );
    assert.equal(buildJobTitle("SEEKING", { location: "인천", companyName: "홍길동" }), "[인천] 홀덤 딜러 구직 · 홍길동");
    assert.equal(buildJobTitle("TEAM", { location: "부산 해운대구", companyName: "ACE" }), "[부산] 팀 ACE 모집");
    assert.equal(buildJobTitle("TEAM", { location: "전국", companyName: "HAN AGENCY" }), "[전국] 팀 HAN AGENCY 모집");
    assert.equal(
      buildJobTitle("TOURNAMENT", {
        location: "서울 구로 G스타디움",
        companyName: "RABBIT FESTIVAL",
        workDate: "2026-10-31",
        endDate: "2026-11-01",
      }),
      "[서울] RABBIT FESTIVAL 대회딜러 (10/31~11/1)",
    );
    assert.equal(
      buildJobTitle("TOURNAMENT", { location: "서울", companyName: "ACE POKER LEAGUE", workDate: null }),
      "[서울] ACE POKER LEAGUE 대회딜러",
    );
  });

  it("accepts only known regions", () => {
    assert.equal(parseJobRegion("서울"), "서울");
    assert.equal(parseJobRegion(" 부산 "), "부산");
    assert.equal(parseJobRegion("서울시"), null);
    assert.equal(parseJobRegion(undefined), null);
  });
});
