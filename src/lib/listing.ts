export const POSITIONS = ["Dealer", "Floor", "Chips", "기타 스태프"] as const;
export const REGIONS = ["수도권", "영남권", "충청권", "호남권", "강원·제주", "해외"] as const;
export const WORK_TYPES = ["정규팀 소속", "정기 프리랜서", "단기 이벤트 스태프"] as const;
export const CAREER_REQS = ["초보 가능 (교육 지원)", "경력자 우대", "대회 경험 필수"] as const;
export const PAY_TYPES = ["일급", "시급", "건당", "추후 협의"] as const;
export const BENEFITS = ["숙소 제공", "교통비 지원", "식사 제공", "교육 지원", "급여 선지급 가능"] as const;
export const APPLY_METHODS = ["외부 링크", "카카오톡 ID·링크", "전화·문자", "사이트 내 직접 지원"] as const;

export type Position = (typeof POSITIONS)[number];
export type Region = (typeof REGIONS)[number];
export type WorkType = (typeof WORK_TYPES)[number];
export type CareerReq = (typeof CAREER_REQS)[number];
export type PayType = (typeof PAY_TYPES)[number];
export type Benefit = (typeof BENEFITS)[number];
export type ApplyMethod = (typeof APPLY_METHODS)[number];

export type HireListing = {
  title: string;
  content: string;
  jobPositions: string[];
  jobLocation: string[];
  jobWorkType: WorkType | "";
  jobExperience: CareerReq | "";
  jobPayType: PayType | "";
  jobPayAmount: string;
  jobBenefits: string[];
  jobApplyMethod: ApplyMethod | "";
  jobApplyValue: string;
  jobWorkDate: string;
  jobAlwaysOpen: boolean;
};

export const EMPTY_HIRE: HireListing = {
  title: "",
  content: "",
  jobPositions: [],
  jobLocation: [],
  jobWorkType: "",
  jobExperience: "",
  jobPayType: "",
  jobPayAmount: "",
  jobBenefits: [],
  jobApplyMethod: "",
  jobApplyValue: "",
  jobWorkDate: "",
  jobAlwaysOpen: false,
};

export function splitCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinCsv(values: string[]): string | null {
  const next = values.map((v) => v.trim()).filter(Boolean);
  return next.length ? next.join(",") : null;
}

export function applyPlaceholder(method: ApplyMethod | ""): string {
  if (method === "외부 링크") return "https://forms.gle/…";
  if (method === "카카오톡 ID·링크") return "카카오톡 ID 또는 open.kakao.com 링크";
  if (method === "전화·문자") return "010-0000-0000";
  return "";
}

export function listingFromBody(body: Record<string, unknown>) {
  const str = (key: string) => {
    const value = body[key];
    return typeof value === "string" ? value.trim() || null : null;
  };
  const list = (key: string) => {
    const value = body[key];
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === "string") return splitCsv(value);
    return [];
  };
  const alwaysOpen = Boolean(body.jobAlwaysOpen);
  const payType = str("jobPayType");
  const applyMethod = str("jobApplyMethod");
  const applyValue = applyMethod === "사이트 내 직접 지원" ? null : str("jobApplyValue");
  return {
    title: str("title") ?? "",
    jobPositions: joinCsv(list("jobPositions")),
    jobLocation: joinCsv(list("jobLocation")),
    jobWorkType: str("jobWorkType"),
    jobExperience: str("jobExperience"),
    jobPayType: payType,
    jobPayAmount: payType === "추후 협의" ? null : str("jobPayAmount"),
    jobBenefits: joinCsv(list("jobBenefits")),
    jobApplyMethod: applyMethod,
    jobApplyValue: applyValue,
    jobContact: applyMethod === "전화·문자" ? applyValue : null,
    jobWorkDate: alwaysOpen ? null : str("jobWorkDate"),
    jobAlwaysOpen: alwaysOpen,
    jobDateFlexible: alwaysOpen,
    jobPay: payType,
  };
}
