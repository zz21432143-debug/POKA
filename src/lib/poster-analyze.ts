/**
 * 대회 포스터 이미지 → 일정 입력칸 자동 채우기.
 * 이미지 글자 읽기는 Claude 비전 API(ANTHROPIC_API_KEY)로 하고, 여기서는 요청 문구와 응답 정리를 맡습니다.
 */
export type PosterFields = {
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  totalPrize: string;
  description: string;
  link: string;
};

export const POSTER_MODEL_DEFAULT = "claude-sonnet-5-5";

export function posterPrompt(today: string) {
  return [
    "이 이미지는 한국 홀덤(포커) 대회 포스터입니다. 포스터에 적힌 글자만 근거로 아래 JSON 하나만 출력하세요. 설명이나 코드블록 없이 JSON만.",
    "{",
    '  "title": "대회명 (가장 크게 적힌 대회 이름)",',
    '  "location": "개최 장소 (장소명과 주소가 있으면 함께)",',
    '  "startDate": "YYYY-MM-DD",',
    '  "endDate": "YYYY-MM-DD (하루짜리면 startDate와 같게)",',
    '  "totalPrize": "총상금 (포스터 표기 그대로, 예: ₩300,000,000 또는 GTD 3억)",',
    '  "description": "일정표·바이인·구조·이벤트 등 나머지 핵심 내용을 줄바꿈으로 정리",',
    '  "link": "포스터에 적힌 웹 주소가 있으면 https:// 포함해서, 없으면 빈 문자열"',
    "}",
    `오늘은 ${today}입니다. 연도가 없으면 오늘 이후 가장 가까운 날짜의 연도를 쓰세요.`,
    "포스터에 없는 값은 빈 문자열로 두고, 지어내지 마세요.",
  ].join("\n");
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** 모델 응답 글에서 JSON을 꺼내 칸별로 정리합니다. 날짜 형식이 틀리면 비웁니다. */
export function normalizePosterAnswer(answer: string): PosterFields | null {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(answer.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
  const startDate = DATE_RE.test(text(raw.startDate, 10)) ? text(raw.startDate, 10) : "";
  let endDate = DATE_RE.test(text(raw.endDate, 10)) ? text(raw.endDate, 10) : "";
  if (endDate && startDate && endDate < startDate) endDate = startDate;
  const link = text(raw.link, 300);
  return {
    title: text(raw.title, 80),
    location: text(raw.location, 120),
    startDate,
    endDate: endDate || startDate,
    totalPrize: text(raw.totalPrize, 60),
    description: text(raw.description, 4000),
    link: /^https?:\/\/\S+$/i.test(link) ? link : "",
  };
}
