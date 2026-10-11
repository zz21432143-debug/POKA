import type { JobKind } from "@/generated/prisma/enums";
import { JOB_REGIONS } from "@/lib/job-status";

export function formatWon(raw: string | null | undefined): string {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return `${Number(digits).toLocaleString("ko-KR")}원`;
}

/**
 * 제목 [ ] 안에 넣을 지역. 상세주소는 빼고 "서울"처럼 광역 지역만 씁니다.
 * 지역 칩에 없는 예전 값은 첫 단어만 씁니다.
 */
export function titleRegion(location: string | null | undefined): string {
  const value = location?.trim() ?? "";
  if (!value) return "미정";
  const region = JOB_REGIONS.find((name) => value.startsWith(name));
  return region ?? value.split(/[\s·,]+/)[0] ?? "미정";
}

/** 분류별로 제목에 올라가는 이름 칸. 모두 jobCompanyName에 저장합니다. */
export const JOB_NAME_LABEL: Record<JobKind, string> = {
  FIXED: "상호명",
  APPLY: "상호명",
  URGENT: "상호명",
  TEAM: "팀 명",
  SEEKING: "본명",
};

export function buildJobTitle(kind: JobKind, fields: {
  location?: string | null;
  companyName?: string | null;
  payAmount?: string | null;
  workDate?: string | null;
}): string {
  const loc = titleRegion(fields.location);
  const name = fields.companyName?.trim() || `${JOB_NAME_LABEL[kind]} 미입력`;
  if (kind === "FIXED") return `[${loc}] 홀덤펍 딜러 구인 · ${name}`;
  if (kind === "APPLY") {
    const pay = formatWon(fields.payAmount) || "미정";
    return `[${loc}] 홀덤 스팟 딜러 구인 · ${name} (시급 ${pay})`;
  }
  if (kind === "URGENT") {
    const when = fields.workDate?.trim() || "즉시";
    return `[${loc}] 홀덤펍 급구/대타 · ${name} (${when})`;
  }
  if (kind === "SEEKING") return `[${loc}] 홀덤 딜러 구직 · ${name}`;
  return `[${loc}] 홀덤 딜러팀 모집 · ${name}`;
}

export type JobFormPayload = {
  jobLocation?: string;
  jobCompanyName?: string;
  jobPayType?: string;
  jobPayAmount?: string;
  jobSchedule?: string;
  jobWorkHours?: string;
  jobBenefits?: string;
  jobExperience?: string;
  jobContact?: string;
  jobWorkDate?: string;
  jobDateFlexible?: boolean;
  jobGuaranteedHours?: string;
  jobOvertime?: string;
  jobTravelPay?: boolean;
  jobSnacks?: boolean;
  jobDressCode?: string;
  jobApplyMethod?: string;
  content?: string;
  isPaid?: boolean;
};
