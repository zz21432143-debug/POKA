import { Badge } from "@/components/ui/badge";
import { formatWon } from "@/lib/jobs";

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
  jobSnacks: boolean;
  jobDressCode: string | null;
  jobApplyMethod: string | null;
};

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
      job.jobDateFlexible ? "날짜 협의" : job.jobWorkDate,
      job.jobGuaranteedHours ? `보장 ${job.jobGuaranteedHours}` : null,
      job.jobOvertime ? `연장 ${job.jobOvertime}` : null,
      job.jobTravelPay ? "차비 지원" : null,
      job.jobSnacks ? "간식 제공" : null,
      job.jobDressCode,
    ].filter((value): value is string => Boolean(value));
  }
  if (job.jobKind === "URGENT") {
    return [
      formatWon(job.jobPayAmount) ? `시급 ${formatWon(job.jobPayAmount)}` : null,
      job.jobDateFlexible ? "즉시/협의" : job.jobWorkDate,
      job.jobWorkHours,
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
            ["희망 근무지", job.jobLocation],
            ["지원 날짜", job.jobDateFlexible ? "날짜 협의" : job.jobWorkDate],
            ["급여", `시급 ${formatWon(job.jobPayAmount) || job.jobPayAmount || "미정"}`],
            ["보장 시간", job.jobGuaranteedHours],
            ["연장", job.jobOvertime],
            ["차비 지원", job.jobTravelPay ? "있음" : "없음"],
            ["간식 제공", job.jobSnacks ? "있음" : "없음"],
            ["복장 규정", job.jobDressCode],
            ["경력 사항", job.jobExperience],
          ]
      : job.jobKind === "URGENT"
        ? [
            ["근무지", job.jobLocation],
            ["필요 날짜", job.jobDateFlexible ? "즉시 / 날짜 협의" : job.jobWorkDate],
            ["시급", formatWon(job.jobPayAmount) || job.jobPayAmount],
            ["근무 시간", job.jobWorkHours],
            ["경력 요구조건", job.jobExperience],
          ]
        : job.jobKind === "SEEKING"
          ? [
              ["표시 이름", job.jobCompanyName],
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
    <dl className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 text-sm sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd>{value || "—"}</dd>
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
