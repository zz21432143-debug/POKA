import { Badge } from "@/components/ui/badge";
import { dateRangeLabel, formatWon } from "@/lib/jobs";
import { todayKstDate } from "@/lib/dates";
import { taxLabel } from "@/lib/job-tax";
import { eventsDateLabel, groupDateLabel, groupJobEvents, parseJobEvents } from "@/lib/job-events";
import { cn } from "cn";

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
  jobEvents?: string | null;
  /** 3.3% 공제 여부 */
  jobTaxDeduction?: string | null;
};

/** 근무 날짜. 여러 날이면 "10/31~11/1" 범위로 보여 줍니다. */
function workDateLabel(job: JobFactsPost, flexibleText: string): string | null {
  if (job.jobAlwaysOpen) return "상시 모집";
  if (job.jobDateFlexible) return flexibleText;
  const events = parseJobEvents(job.jobEvents);
  if (events.length > 0) return eventsDateLabel(events);
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
      job.jobEvents ? null : workDateLabel(job, "날짜 협의"),
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
      job.jobEvents ? null : workDateLabel(job, "일정 추후 공지"),
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
            ["행사 일정", job.jobEvents ? null : job.jobSchedule],
            ["모집 인원", job.jobHeadcount],
            ["급여", `시급 ${formatWon(job.jobPayAmount) || job.jobPayAmount || "미정"}`],
            ["3.3% 공제", taxLabel(job.jobTaxDeduction)],
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
            ["3.3% 공제", taxLabel(job.jobTaxDeduction)],
            ["보장 시간", job.jobGuaranteedHours],
            ["행사 일정", job.jobEvents ? null : job.jobSchedule],
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
            ["3.3% 공제", taxLabel(job.jobTaxDeduction)],
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

  // 선택 항목이 많아 비어 있는 칸은 숨깁니다.
  const filled = rows.filter((row): row is [string, string] => Boolean(row[1]));
  const key = filled.filter(([label]) => KEY_FACTS.has(label));
  const rest = filled.filter(([label]) => !KEY_FACTS.has(label));

  return (
    <section aria-label="근무 조건" className="grid gap-3 rounded-xl border border-[#4a3f33] bg-[#17120f] p-3 sm:p-4">
      {/* 핵심 조건(장소·날짜·급여·시간)은 크게 */}
      {key.length > 0 ? (
        <dl className="grid grid-cols-2 gap-2">
          {key.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#c9a25c]/35 bg-[#241b14] px-2.5 py-2 sm:px-3 sm:py-2.5">
              <dt className="text-[13px] font-bold text-[#e7c98a]">{label}</dt>
              <dd className="mt-0.5 break-words text-[17px] font-bold leading-snug text-white sm:text-lg">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {rest.length > 0 ? (
        <dl className="divide-y divide-white/10 rounded-lg bg-black/25">
          {rest.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 px-3 py-2.5 sm:grid-cols-[8rem_1fr]">
              <dt className="text-sm font-semibold text-[#c9b48a]">{label}</dt>
              <dd className="break-words text-base font-medium leading-relaxed text-[#f3eadb]">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

/** 상세에서 크게 보여 줄 핵심 조건 */
const KEY_FACTS = new Set([
  "근무지",
  "희망 근무지",
  "장소",
  "근무 날짜",
  "대회 일정",
  "필요 날짜",
  "급여",
  "시급",
  "급여 금액",
  "3.3% 공제",
  "근무 시간",
  "출근 시간",
  "보장 시간",
]);

/**
 * 날짜별 일정 목록. 지난 날짜는 회색·취소선으로 보여 줍니다.
 * compact는 목록 카드용 작은 칩입니다.
 */
export function JobEventList({ job, compact = false }: { job: JobFactsPost; compact?: boolean }) {
  const groups = groupJobEvents(parseJobEvents(job.jobEvents));
  if (groups.length === 0) return null;
  const today = todayKstDate();
  if (compact) {
    return (
      <ul className="mt-2 flex flex-wrap gap-1" aria-label="일정">
        {groups.map((g) => {
          const past = g.end < today;
          return (
            <li
              key={`${g.start}-${g.name}`}
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[12px] font-semibold",
                past ? "bg-white/5 text-[#6b6460] line-through" : "bg-[#2a2017] text-[#e7c98a]",
              )}
            >
              {groupDateLabel(g)}
              {g.name ? ` ${g.name}` : ""}
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <section className="rounded-xl border border-[#3a332c] bg-[#141110] p-3" aria-label="일정">
      <p className="mb-2 text-xs font-semibold text-[#9CA3AF]">일정 · 지난 날짜는 회색으로 표시됩니다</p>
      <ul className="grid gap-1.5">
        {groups.map((g) => {
          const past = g.end < today;
          return (
            <li
              key={`${g.start}-${g.name}`}
              className={cn(
                "flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-2.5 py-2 text-sm",
                past ? "bg-white/[0.03] text-[#6b6460]" : "bg-[#2a2017] text-white",
              )}
            >
              <span className={cn("font-bold", past ? "line-through" : "text-[#e7c98a]")}>{groupDateLabel(g)}</span>
              {g.name ? <span className={cn(past && "line-through")}>{g.name}</span> : null}
              {g.headcount ? <span className={cn("text-[#c9c0b2]", past && "text-[#6b6460]")}>{g.headcount}</span> : null}
              {past ? <span className="ml-auto text-xs">종료</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
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
