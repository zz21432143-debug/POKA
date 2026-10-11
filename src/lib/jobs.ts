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
  // 상호명(팀 명)이 제목 앞에 옵니다. 예: [서울] POKA홀덤 구인, [부산] 팀 ACE 모집
  const loc = titleRegion(fields.location);
  const name = fields.companyName?.trim() || `${JOB_NAME_LABEL[kind]} 미입력`;
  if (kind === "FIXED") return `[${loc}] ${name} 구인`;
  if (kind === "APPLY") {
    const pay = formatWon(fields.payAmount) || "미정";
    return `[${loc}] ${name} 지원딜러 구인 (시급 ${pay})`;
  }
  if (kind === "URGENT") {
    const when = fields.workDate?.trim() || "즉시";
    return `[${loc}] ${name} 급구/대타 (${when})`;
  }
  if (kind === "SEEKING") return `[${loc}] 홀덤 딜러 구직 · ${name}`;
  return `[${loc}] 팀 ${name} 모집`;
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
  jobTravelPayAmount?: string;
  jobSnacks?: boolean;
  jobDressCode?: string;
  jobApplyMethod?: string;
  content?: string;
  isPaid?: boolean;
};
