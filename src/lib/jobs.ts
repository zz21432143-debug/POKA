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
  workDate?: string | null;
}): string {
  const loc = fields.location?.trim() || "미정";
  if (kind === "FIXED") {
    const name = fields.companyName?.trim() || "상호 미입력";
    return `[${loc}] 홀덤펍 딜러 구인 · ${name}`;
  }
  if (kind === "APPLY") {
    const pay = formatWon(fields.payAmount) || "미정";
    return `[${loc}] 홀덤 스팟 딜러 구인 (시급 ${pay})`;
  }
  if (kind === "URGENT") {
    const when = fields.workDate?.trim() || "즉시";
    return `[${loc}] 홀덤펍 급구/대타 (${when})`;
  }
  if (kind === "SEEKING") {
    const name = fields.companyName?.trim() || "닉네임 미입력";
    return `[${loc}] 홀덤 딜러 구직 · ${name}`;
  }
  const team = fields.companyName?.trim() || "팀명 미입력";
  return `[${loc}] 홀덤 딜러팀 모집 · ${team}`;
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
