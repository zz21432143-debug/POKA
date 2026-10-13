import { JOB_KIND_LABEL } from "@/lib/nav";
import { titleRegion } from "@/lib/jobs";

/** 구글 채용 검색(JobPosting)에 필요한 공고 칸 */
export type JobLdInput = {
  id: string;
  title: string;
  createdAt: Date;
  jobKind: string | null;
  jobLocation: string | null;
  jobCompanyName: string | null;
  jobPayType: string | null;
  jobPayAmount: string | null;
  jobWorkHours: string | null;
  jobHeadcount: string | null;
  jobBenefits: string | null;
  jobExperience: string | null;
};

const PAY_UNIT: Record<string, string> = { 시급: "HOUR", 일급: "DAY", 월급: "MONTH" };

/** 고정 직원은 정규직, 그 밖(지원·대회·급구·팀)은 파트타임·임시 */
function employmentType(kind: string | null) {
  if (kind === "FIXED") return ["FULL_TIME"];
  return ["PART_TIME", "TEMPORARY"];
}

/** "15,000원" → 15000. 숫자가 없거나 터무니없으면 null */
export function payNumber(raw: string | null) {
  const digits = (raw ?? "").replace(/[^0-9]/g, "");
  const value = Number(digits);
  return digits && value >= 1000 && value < 100_000_000 ? value : null;
}

/**
 * 공고 → schema.org JobPosting. 연락처는 넣지 않습니다(로그인 후 공개).
 * validThrough: 자동 마감일(KST 그날 끝).
 */
export function jobPostingJsonLd(job: JobLdInput, base: string, validThrough: string | null) {
  const picked = titleRegion(job.jobLocation);
  const region = picked && picked !== "미정" ? picked : "대한민국";
  const kindLabel = job.jobKind ? (JOB_KIND_LABEL[job.jobKind as keyof typeof JOB_KIND_LABEL] ?? "딜러") : "딜러";
  const company = job.jobCompanyName?.trim() || `${region} 홀덤펍`;
  const amount = payNumber(job.jobPayAmount);
  const unit = job.jobPayType ? PAY_UNIT[job.jobPayType] : undefined;
  const lines = [
    `${company} ${kindLabel} 모집 (${job.jobLocation ?? region})`,
    job.jobPayType && amount ? `급여: ${job.jobPayType} ${amount.toLocaleString("ko-KR")}원` : null,
    job.jobWorkHours ? `근무 시간: ${job.jobWorkHours}` : null,
    job.jobHeadcount ? `모집 인원: ${job.jobHeadcount}` : null,
    job.jobExperience ? `경력: ${job.jobExperience}` : null,
    job.jobBenefits ? `복리후생: ${job.jobBenefits}` : null,
    "지원 방법과 연락처는 POKA 로그인 후 확인할 수 있습니다.",
  ].filter(Boolean);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: lines.map((line) => `<p>${escapeHtml(String(line))}</p>`).join(""),
    datePosted: job.createdAt.toISOString(),
    employmentType: employmentType(job.jobKind),
    hiringOrganization: { "@type": "Organization", name: company },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "KR",
        addressRegion: region,
        addressLocality: job.jobLocation ?? region,
      },
    },
    identifier: { "@type": "PropertyValue", name: "POKA", value: job.id },
    url: `${base}/posts/${job.id}`,
    directApply: false,
  };
  if (validThrough) data.validThrough = `${validThrough}T23:59:59+09:00`;
  if (amount && unit) {
    data.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "KRW",
      value: { "@type": "QuantitativeValue", value: amount, unitText: unit },
    };
  }
  return data;
}

/** 대회 캘린더 글 → schema.org Event(검색 결과에 날짜·장소) */
export function eventJsonLd(
  post: { id: string; title: string; content: string | null; eventDate: string | null; eventEndDate: string | null; promoLocation: string | null; bannerImageUrl: string | null },
  base: string,
) {
  if (!post.eventDate) return null;
  const place = post.promoLocation?.trim() || "대한민국";
  const image = post.bannerImageUrl && !post.bannerImageUrl.startsWith("/banners/") ? new URL(post.bannerImageUrl, base).toString() : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: post.title,
    startDate: post.eventDate,
    endDate: post.eventEndDate || post.eventDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: place, address: { "@type": "PostalAddress", addressCountry: "KR", streetAddress: place } },
    description: (post.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) || post.title,
    url: `${base}/posts/${post.id}`,
    ...(image ? { image: [image] } : {}),
    organizer: { "@type": "Organization", name: "POKA", url: base },
  };
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** <script type="application/ld+json"> 안에 안전하게 넣기 */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
