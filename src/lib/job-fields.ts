import type { JobKind } from "@/generated/prisma/enums";
import { buildJobTitle } from "@/lib/jobs";
import {
  eventsDateLabel,
  eventsHeadcountTotal,
  eventsScheduleLines,
  normalizeJobEvents,
  serializeJobEvents,
} from "@/lib/job-events";

const MULTI_DAY_KINDS: JobKind[] = ["APPLY", "TOURNAMENT"];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function jobFieldsFromBody(body: Record<string, unknown>, jobKind: JobKind) {
  const str = (key: string) => {
    const value = body[key];
    return typeof value === "string" ? value.trim() || null : null;
  };
  const date = (key: string) => {
    const value = str(key);
    return value && DATE_RE.test(value) ? value : null;
  };
  const bool = (key: string) => Boolean(body[key]);
  const hourly = jobKind === "APPLY" || jobKind === "URGENT" || jobKind === "TOURNAMENT";
  const payType = hourly ? "시급" : str("jobPayType");
  const location = str("jobLocation");
  const company = str("jobCompanyName");
  const amount = str("jobPayAmount");
  const alwaysOpen = bool("jobAlwaysOpen");
  const flexible = bool("jobDateFlexible") || alwaysOpen;
  // 여러 날짜 일정(대회·지원 딜러). 있으면 첫날·마지막 날·일정 문구·인원 합계를 여기서 만듭니다.
  const events = flexible || !MULTI_DAY_KINDS.includes(jobKind) ? [] : normalizeJobEvents(body.jobEvents);
  const workDate = flexible ? null : events[0]?.date ?? str("jobWorkDate");
  // 끝 날짜는 시작 날짜보다 뒤일 때만 저장합니다(여러 날 대회).
  const endRaw = flexible ? null : events.length > 0 ? events[events.length - 1].date : date("jobEndDate");
  const endDate = endRaw && workDate && endRaw > workDate ? endRaw : null;
  const schedule = events.length > 0 ? eventsScheduleLines(events).join(" / ") : str("jobSchedule");
  const headcount = str("jobHeadcount") ?? (eventsHeadcountTotal(events) || null);
  return {
    title: buildJobTitle(jobKind, {
      location,
      companyName: company,
      payAmount: amount,
      workDate,
      endDate,
      dateLabel: events.length > 0 ? eventsDateLabel(events) : null,
    }),
    jobEvents: serializeJobEvents(events),
    jobLocation: location,
    jobCompanyName: company,
    jobPayType: payType,
    jobPayAmount: amount,
    jobSchedule: schedule,
    jobWorkHours: str("jobWorkHours"),
    jobBenefits: str("jobBenefits"),
    jobExperience: str("jobExperience"),
    jobContact: str("jobContact"),
    jobWorkDate: workDate,
    jobEndDate: endDate,
    jobDeadline: alwaysOpen ? null : date("jobDeadline"),
    jobDateFlexible: flexible,
    jobAlwaysOpen: alwaysOpen,
    jobHeadcount: headcount,
    jobGuaranteedHours: str("jobGuaranteedHours"),
    jobOvertime: str("jobOvertime"),
    jobTravelPay: bool("jobTravelPay"),
    // 차비 금액은 차비 지원을 켰을 때만 저장합니다.
    jobTravelPayAmount: bool("jobTravelPay")
      ? str("jobTravelPayAmount")?.replace(/[^\d]/g, "") || null
      : null,
    jobSnacks: bool("jobSnacks"),
    jobDressCode: str("jobDressCode"),
    jobApplyMethod: str("jobApplyMethod"),
    // 지원 링크(구글폼 등). http(s) 주소만 받습니다.
    jobApplyValue: /^https?:\/\/\S+$/i.test(str("jobApplyValue") ?? "") ? str("jobApplyValue") : null,
    jobPay: payType,
  };
}
