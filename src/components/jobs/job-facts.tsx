import { Badge } from "@/components/ui/badge";
import { dateRangeLabel, formatWon } from "@/lib/jobs";

export type JobFactsPost = {
  jobKind: string | null;
  jobLocation: string | null;
  jobCompanyName: string | null;
  jobPayType: string | null;
  jobPayAmount: string | null;
  jobSchedule: string | null;
  jobWorkHours: string | null;
  jobBenefits: string | null;
  jobExperience: string | null;
  jobWorkDate: string | null;
  jobDateFlexible: boolean;
  jobGuaranteedHours: string | null;
  jobOvertime: string | null;
  jobTravelPay: boolean;
  jobTravelPayAmount: string | null;
  jobSnacks: boolean;
  jobDressCode: string | null;
  jobApplyMethod: string | null;
  jobEndDate?: string | null;
  jobDeadline?: string | null;
  jobHeadcount?: string | null;
  jobApplyValue?: string | null;
  jobAlwaysOpen?: boolean;
};

/** 근무 날짜. 여러 날이면 "10/31~11/1" 범위로 보여 줍니다. */
function workDateLabel(job: JobFactsPost, flexibleText: string): string | null {
  if (job.jobAlwaysOpen) return "상시 모집";
  if (job.jobDateFlexible) return flexibleText;
  if (job.jobEndDate) return dateRangeLabel(job.jobWorkDate, job.jobEndDate);
  return job.jobWorkDate;
}

function deadlineLabel(job: JobFactsPost): string | null {
  return job.jobDeadline ? `${dateRangeLabel(job.jobDeadline, null)} 마감` : null;
}

/** 지원 딜러(APPLY)·급구(URGENT) 공고의 차비. 금액이 없는 예전 글은 "차비 지원"만 표시합니다. */
export function travelPayLabel(job: JobFactsPost): string | null {
  if (!job.jobTravelPay) return null;
  const amount = formatWon(job.jobTravelPayAmount);
  return amount ? `차비 ${amount}` : "차비 지원";
}

function travelPayFact(job: JobFactsPost) {
  return job.jobTravelPay ? formatWon(job.jobTravelPayAmount) || "있음" : "없음";
}

export function jobTags(job: JobFactsPost): string[] {
  if (job.jobKind === "FIXED") {
    return [
      job.jobPayType,
      formatWon(job.jobPayAmount) || null,
      job.jobSchedule,
      job.jobWorkHours,
      job.jobBenefits,
      job.jobExperience,
    ].filter((value): value is string => Boolean(value));
  }
  if (job.jobKind === "APPLY") {
    return [
      formatWon(job.jobPayAmount) ? `시급 ${formatWon(job.jobPayAmount)}` : null,
      workDateLabel(job, "날짜 협의"),
      job.jobGuaranteedHours ? `보장 ${job.jobGuaranteedHours}` : null,
      job.jobOvertime ? `연장 ${job.jobOvertime}` : null,
      travelPayLabel(job),
      job.jobSnacks ? "간식 제공" : null,
      job.jobDressCode,
    ].filter((value): value is string => Boolean(value));
  }
  if (job.jobKind === "TOURNAMENT") {
    return [
      formatWon(job.jobPayAmount) ? `시급 ${formatWon(job.jobPayAmount)}` : null,
      workDateLabel(job, "일정 추후 공지"),
      job.jobHeadcount ? `${job.jobHeadcount} 모집` : null,
      job.jobGuaranteedHours ? `보장 ${job.jobGuaranteedHours}` : null,
      travelPayLabel(job),
      deadlineLabel(job),
    ].filter((value): value is string => Boolean(value));
  }
  if (job.jobKind === "URGENT") {
    return [
      formatWon(job.jobPayAmount) ? `시급 ${formatWon(job.jobPayAmount)}` : null,
      workDateLabel(job, "즉시/협의"),
      job.jobWorkHours,
      travelPayLabel(job),
      job.jobExperience,
    ].filter((value): value is string => Boolean(value));
  }
  if (job.jobKind === "SEEKING") {
    return [job.jobLocation, job.jobPayAmount, job.jobSchedule, job.jobExperience].filter(
      (value): value is string => Boolean(value),
    );
  }
  return [job.jobLocation, job.jobBenefits, job.jobExperience, job.jobApplyMethod].filter(
    (value): value is string => Boolean(value),
  );
}

export function JobFacts({ job }: { job: JobFactsPost }) {
  const rows =
    job.jobKind === "FIXED"
      ? [
          ["근무지", job.jobLocation],
          ["상호명", job.jobCompanyName],
          ["급여형태", job.jobPayType],
          ["급여 금액", formatWon(job.jobPayAmount) || job.jobPayAmount],
          ["근무 일수", job.jobSchedule],
          ["근무 시간", job.jobWorkHours],
          ["복리후생", job.jobBenefits],
          ["경력 요구조건", job.jobExperience],
        ]
      : job.jobKind === "APPLY"
        ? [
            ["상호명", job.jobCompanyName],
            ["희망 근무지", job.jobLocation],
            ["근무 날짜", workDateLabel(job, "날짜 협의")],
            ["행사 일정", job.jobSchedule],
            ["모집 인원", job.jobHeadcount],
            ["급여", `시급 ${formatWon(job.jobPayAmount) || job.jobPayAmount || "미정"}`],
            ["보장 시간", job.jobGuaranteedHours],
            ["연장", job.jobOvertime],
            ["차비 지원", travelPayFact(job)],
            ["간식 제공", job.jobSnacks ? "있음" : "없음"],
            ["복지", job.jobBenefits],
            ["출근 시간", job.jobWorkHours],
            ["복장 규정", job.jobDressCode],
            ["경력 사항", job.jobExperience],
            ["지원 방법", job.jobApplyMethod],
          ]
      : job.jobKind === "TOURNAMENT"
        ? [
            ["대회명", job.jobCompanyName],
            ["장소", job.jobLocation],
            ["대회 일정", workDateLabel(job, "추후 공지")],
            ["급여", `시급 ${formatWon(job.jobPayAmount) || job.jobPayAmount || "미정"}`],
            ["보장 시간", job.jobGuaranteedHours],
            ["행사 일정", job.jobSchedule],
            ["모집 인원", job.jobHeadcount],
            ["모집 마감", job.jobDeadline],
            ["출근 시간", job.jobWorkHours],
            ["차비", job.jobTravelPay ? travelPayFact(job) : null],
            ["자격 · 경력", job.jobExperience],
            ["복리후생", job.jobBenefits],
            ["복장 규정", job.jobDressCode],
            ["지원 방법", job.jobApplyMethod],
          ]
      : job.jobKind === "URGENT"
        ? [
            ["상호명", job.jobCompanyName],
            ["근무지", job.jobLocation],
            ["필요 날짜", workDateLabel(job, "즉시 / 날짜 협의")],
            ["시급", formatWon(job.jobPayAmount) || job.jobPayAmount],
            ["근무 시간", job.jobWorkHours],
            ["차비 지원", travelPayFact(job)],
            ["경력 요구조건", job.jobExperience],
          ]
        : job.jobKind === "SEEKING"
          ? [
              ["본명", job.jobCompanyName],
              ["희망 지역", job.jobLocation],
              ["희망 급여", job.jobPayAmount],
              ["가능 일정", job.jobSchedule],
              ["경력", job.jobExperience],
            ]
        : [
            ["팀 명", job.jobCompanyName],
            ["주요 활동 지역", job.jobLocation],
            ["이력·수상", job.jobExperience],
            ["근무 혜택", job.jobBenefits],
            ["지원 방법", job.jobApplyMethod],
          ];

  return (
    <dl className="grid grid-cols-2 gap-2 rounded-xl border border-[#3a332c] bg-[#141110] p-3 text-sm text-[#E5E7EB] sm:grid-cols-3">
      {/* 선택 항목이 많아 비어 있는 칸은 숨깁니다. */}
      {rows.filter(([, value]) => Boolean(value)).map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-[#9CA3AF]">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function JobTagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag}>
          <Badge variant="outline">{tag}</Badge>
        </li>
      ))}
    </ul>
  );
}
