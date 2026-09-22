import type { JobKind } from "@/generated/prisma/enums";
import { buildJobTitle } from "@/lib/jobs";

export function jobFieldsFromBody(body: Record<string, unknown>, jobKind: JobKind) {
  const str = (key: string) => {
    const value = body[key];
    return typeof value === "string" ? value.trim() || null : null;
  };
  const bool = (key: string) => Boolean(body[key]);
  const payType = jobKind === "APPLY" ? "시급" : str("jobPayType");
  const location = str("jobLocation");
  const company = str("jobCompanyName");
  const amount = str("jobPayAmount");
  return {
    title: buildJobTitle(jobKind, {
      location,
      companyName: company,
      payAmount: amount,
    }),
    jobLocation: location,
    jobCompanyName: company,
    jobPayType: payType,
    jobPayAmount: amount,
    jobSchedule: str("jobSchedule"),
    jobWorkHours: str("jobWorkHours"),
    jobBenefits: str("jobBenefits"),
    jobExperience: str("jobExperience"),
    jobContact: str("jobContact"),
    jobWorkDate: bool("jobDateFlexible") ? null : str("jobWorkDate"),
    jobDateFlexible: bool("jobDateFlexible"),
    jobGuaranteedHours: str("jobGuaranteedHours"),
    jobOvertime: str("jobOvertime"),
    jobTravelPay: bool("jobTravelPay"),
    jobSnacks: bool("jobSnacks"),
    jobDressCode: str("jobDressCode"),
    jobApplyMethod: str("jobApplyMethod"),
    jobPay: payType,
  };
}
