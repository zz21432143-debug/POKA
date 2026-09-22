import type { JobKind } from "@/generated/prisma/enums";

export function formatWon(raw: string | null | undefined): string {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return `${Number(digits).toLocaleString("ko-KR")}원`;
}

export function buildJobTitle(kind: JobKind, fields: {
  location?: string | null;
  companyName?: string | null;
  payAmount?: string | null;
}): string {
  const loc = fields.location?.trim() || "미정";
  if (kind === "FIXED") {
    const name = fields.companyName?.trim() || "상호 미입력";
    return `[${loc}] ${name} - 고정 직원 모집`;
  }
  if (kind === "APPLY") {
    const pay = formatWon(fields.payAmount) || "미정";
    return `[${loc}] 지원 딜러 (시급 ${pay})`;
  }
  const team = fields.companyName?.trim() || "팀명 미입력";
  return `[${loc}] ${team} - 딜러 팀원 모집`;
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
