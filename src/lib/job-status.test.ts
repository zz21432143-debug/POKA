import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JOB_EXPIRE_DAYS, jobExpiresOn, jobStatus, parseJobRegion } from "./job-status";

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

  it("accepts only known regions", () => {
    assert.equal(parseJobRegion("서울"), "서울");
    assert.equal(parseJobRegion(" 부산 "), "부산");
    assert.equal(parseJobRegion("서울시"), null);
    assert.equal(parseJobRegion(undefined), null);
  });
});
