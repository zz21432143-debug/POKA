import { formatWon } from "@/lib/jobs";
import { splitCsv } from "@/lib/listing";

export type ListingFactsPost = {
  boardType: string;
  title: string;
  jobPositions: string | null;
  jobLocation: string | null;
  jobWorkType: string | null;
  jobExperience: string | null;
  jobPayType: string | null;
  jobPayAmount: string | null;
  jobBenefits: string | null;
  jobApplyMethod: string | null;
  jobAlwaysOpen: boolean;
  jobWorkDate: string | null;
  eventDate: string | null;
};

export function isListingPost(post: { boardType: string; jobPositions: string | null }) {
  return (
    Boolean(post.jobPositions) ||
    post.boardType === "JOBS" ||
    post.boardType === "TALENT" ||
    post.boardType === "PICKUP" ||
    post.boardType === "SCHEDULE"
  );
}

export function ListingFacts({ post }: { post: ListingFactsPost }) {
  const pay =
    post.jobPayType === "추후 협의"
      ? "추후 협의"
      : [post.jobPayType, formatWon(post.jobPayAmount) || post.jobPayAmount].filter(Boolean).join(" ");
  const rows: [string, string][] = [
    ["포지션", splitCsv(post.jobPositions).join(" · ")],
    ["지역", splitCsv(post.jobLocation).join(" · ")],
    ["근무 형태", post.jobWorkType ?? ""],
    ["경력 요건", post.jobExperience ?? ""],
    ["급여", pay],
    ["복리후생", splitCsv(post.jobBenefits).join(" · ")],
    ["지원 방법", post.jobApplyMethod ?? ""],
    ["마감", post.jobAlwaysOpen ? "상시 모집" : post.jobWorkDate || post.eventDate || ""],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  if (rows.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 text-sm sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
