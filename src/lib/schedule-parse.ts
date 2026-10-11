import { parseDateList } from "@/lib/job-parse";

/**
 * 대회 캘린더 [자동 나누기]. 복사한 대회 정보(한 줄이든 여러 줄 덩어리든)를 칸별로 나눕니다. AI 없이 규칙으로만 읽습니다.
 *
 * 읽는 순서
 * 1. "대회명:", "장소:", "일시:", "총상금:" 같은 머리말이 있으면 그 값을 씁니다(한 줄에 여러 개 있어도 됨).
 * 2. 머리말이 없으면 글에서 직접 찾습니다.
 *    - 날짜: "2026.11.14 - 11.16", "11월 21일 ~ 23일", "12/5~12/7" 같은 날짜 표현
 *    - 총상금: "GTD 3억", "총상금 5,000만원", "₩300,000,000"
 *    - 장소: 도로명 주소(○○시 ○○구 ○○로 123)나 호텔·홀·센터·○층 같은 장소 이름
 *    - 대회명: 【 】·[ ]로 감싼 글, 여러 줄이면 첫 줄, 한 줄이면 날짜·상금·장소 앞부분
 * 원문 전체는 상세 내용으로 들어갑니다.
 */
export type ParsedSchedule = {
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  totalPrize: string;
  link: string;
  description: string;
};

const LABELS: { key: "title" | "location" | "date" | "prize"; re: string }[] = [
  { key: "title", re: "대회\\s*명|대회\\s*이름|이벤트\\s*명|행사\\s*명" },
  { key: "location", re: "개최\\s*장소|장소|개최지|위치|주소" },
  { key: "date", re: "대회\\s*일정|대회\\s*기간|일시|일정|기간|날짜|개최\\s*일" },
  { key: "prize", re: "총\\s*상금|보장\\s*상금|상금|프라이즈" },
];
const ANY_LABEL = LABELS.map((l) => l.re).join("|");
/** 머리말 자리: 줄 처음이나 구분자(공백, |, /, ·, ,) 뒤의 "머리말 :" */
const LABEL_RE = new RegExp(`(?:^|[\\s|/·,])(${ANY_LABEL})\\s*[:：]`, "g");

const WEEKDAY = "(?:\\s*\\(\\s*[월화수목금토일]\\s*\\))?";
const ONE_DATE = `(?:\\d{4}\\s*[년./-]\\s*)?\\d{1,2}\\s*[월./-]\\s*\\d{1,2}\\s*일?${WEEKDAY}`;
/** 날짜 하나 또는 기간(끝 날짜는 월·연도 생략 가능) */
const DATE_SPAN_RE = new RegExp(
  `${ONE_DATE}(?:\\s*(?:~|-|–|—|부터)\\s*(?:(?:\\d{4}\\s*[년./-]\\s*)?\\d{1,2}\\s*[월./-]\\s*)?\\d{1,2}\\s*일?${WEEKDAY}(?:\\s*까지)?)?`,
  "g",
);
const PRIZE_RE =
  /(?:GTD|총\s*상금|보장\s*상금|상금|보장)\s*[:：]?\s*₩?\s*[\d,.]+\s*(?:억|천만|백만|만)?(?:\s*[\d,]+\s*(?:천만|만))?\s*원?(?:\s*GTD)?|₩\s*[\d,]{4,}\s*원?(?:\s*GTD)?|\d+(?:\.\d+)?\s*억(?:\s*\d+\s*천?만)?\s*원?\s*(?:GTD|보장)?|[\d,]{6,}\s*원\s*(?:GTD|보장)?/i;
const SIDO = "서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|충청북도|충청남도|전북|전남|전라북도|전라남도|경북|경남|경상북도|경상남도|제주";
const ADDRESS_RE = new RegExp(
  `(?:${SIDO})[가-힣]*\\s+(?:[가-힣]+(?:시|군|구)\\s+){1,2}[가-힣\\d]+(?:로|길)\\s*\\d+(?:-\\d+)?(?:\\s*[,]?\\s*(?:\\d+\\s*층|[가-힣A-Za-z\\d]+(?:호텔|홀|센터|컨벤션|타워|빌딩|대학교|펍|라운지|룸)))*`,
);
const VENUE_WORD = /(호텔|홀\b|홀\s|센터|컨벤션|펍|라운지|타워|빌딩|대학교|카지노|\d+\s*층|룸\b)/;
const LINK_RE = /https?:\/\/[^\s<>"')\]]+/;

function stripDecor(text: string) {
  return text.replace(/[📅📍🏆💰🗓️⏰🎉🔥✨▶►▪︎◆◇■□○●✔✓☑️👉•]/gu, " ").replace(/[ \t]+/g, " ").trim();
}

/** 앞뒤 구분 기호 정리 */
function tidy(text: string) {
  return text.replace(/^[\s|/·,:：\-–—]+|[\s|/·,:：\-–—]+$/g, "").replace(/\s{2,}/g, " ").trim();
}

/** 날짜 표현 → [시작, 끝] YYYY-MM-DD */
function datesOf(expr: string, today: string): [string, string] {
  const normalized = expr
    .replace(/(\d{4})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})\.?/g, "$1년 $2월 $3일")
    .replace(/(?<![\d년])(\d{1,2})\s*[./]\s*(\d{1,2})(?![\d일])/g, "$1/$2")
    .replace(/\(\s*[월화수목금토일]\s*\)/g, "")
    .replace(/\s*(~|-|–|—|부터)\s*/g, "~")
    .replace(/까지/g, "");
  const dates = parseDateList(normalized, today);
  return [dates[0] ?? "", dates[dates.length - 1] ?? ""];
}

/** 머리말 값들: 한 줄에 "대회명: A | 장소: B"처럼 이어져 있어도 나눠 읽습니다. */
function labeledValues(text: string) {
  const found: Partial<Record<(typeof LABELS)[number]["key"], string>> = {};
  const hits = [...text.matchAll(LABEL_RE)].map((m) => ({
    label: m[1],
    valueStart: (m.index ?? 0) + m[0].length,
    at: m.index ?? 0,
  }));
  hits.forEach((hit, i) => {
    const end = Math.min(i + 1 < hits.length ? hits[i + 1].at : text.length, nextLineBreak(text, hit.valueStart));
    const value = tidy(text.slice(hit.valueStart, end));
    const key = LABELS.find((l) => new RegExp(`^(?:${l.re})$`).test(hit.label.replace(/\s+/g, " ")))?.key;
    if (key && value && !found[key]) found[key] = value;
  });
  return found;
}

function nextLineBreak(text: string, from: number) {
  const at = text.indexOf("\n", from);
  return at < 0 ? text.length : at;
}

export function parseScheduleText(raw: string, today: string): ParsedSchedule {
  const original = raw.replace(/\r\n?/g, "\n").trim();
  const text = original
    .split("\n")
    .map((line) => stripDecor(line))
    .filter(Boolean)
    .join("\n");
  const lines = text.split("\n");
  const oneLine = lines.length === 1;
  const out: ParsedSchedule = {
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    totalPrize: "",
    link: original.match(LINK_RE)?.[0] ?? "",
    description: original,
  };
  const used: string[] = [];

  // 1) 머리말
  const labeled = labeledValues(text);
  if (labeled.title) out.title = labeled.title;
  if (labeled.location) out.location = labeled.location;
  if (labeled.prize) out.totalPrize = labeled.prize;
  if (labeled.date) [out.startDate, out.endDate] = datesOf(labeled.date, today);

  // 2) 날짜: 모집 마감·접수 줄은 건너뛰고 처음 나오는 날짜 표현
  if (!out.startDate) {
    for (const line of lines) {
      if (/(마감|접수|신청|발표)/.test(line) && !oneLine) continue;
      const span = [...line.matchAll(DATE_SPAN_RE)].find((m) => {
        const before = line.slice(0, m.index);
        return !/(마감|접수|신청)\s*[:：]?\s*$/.test(before);
      });
      if (!span) continue;
      const [start, end] = datesOf(span[0], today);
      if (start) {
        out.startDate = start;
        out.endDate = end;
        used.push(span[0]);
        break;
      }
    }
  }
  if (!out.endDate || out.endDate < out.startDate) out.endDate = out.startDate;

  // 3) 총상금
  if (!out.totalPrize) {
    const m = text.match(PRIZE_RE);
    if (m) {
      out.totalPrize = tidy(m[0].replace(/^(총\s*상금|보장\s*상금|상금)\s*[:：]?\s*/, "")).slice(0, 60);
      used.push(m[0]);
    }
  }

  // 4) 대회명
  if (!out.title) {
    const bracket = text.match(/【\s*([^】]+?)\s*】/) ?? text.match(/^\s*\[\s*([^\]\n]{2,60})\s*\]/);
    if (bracket) {
      out.title = bracket[1];
      used.push(bracket[0]);
    } else if (!oneLine) {
      out.title = tidy(lines[0]);
      used.push(lines[0]);
    } else {
      // 한 줄: 날짜·상금·주소·장소 단어·머리말이 처음 나오는 곳 앞까지
      const cuts = [
        text.search(DATE_SPAN_RE),
        text.search(PRIZE_RE),
        text.search(ADDRESS_RE),
        text.search(VENUE_WORD),
        text.search(new RegExp(`(${ANY_LABEL})\\s*[:：]`)),
      ].filter((i) => i > 0);
      const cut = cuts.length ? Math.min(...cuts) : text.length;
      // 장소 단어가 가장 먼저면 그 단어가 붙은 낱말 앞에서 자릅니다(예: "POKA호텔").
      const head = text.slice(0, cut).replace(/\S*$/, (w) => (cut === text.search(VENUE_WORD) ? "" : w));
      out.title = tidy(head || text.slice(0, cut));
      used.push(out.title);
    }
  }
  out.title = out.title.slice(0, 80);

  // 5) 개최 장소(주소)
  if (!out.location) {
    const address = text.match(ADDRESS_RE)?.[0];
    if (address) {
      // 주소 바로 앞에 붙은 장소 이름(예: "파르나스호텔 서울특별시 …")도 함께 둡니다.
      out.location = tidy(address);
    } else if (!oneLine) {
      const line = lines.find(
        (l, i) => i > 0 && VENUE_WORD.test(l) && !PRIZE_RE.test(l) && !new RegExp(DATE_SPAN_RE.source).test(l),
      );
      if (line) out.location = tidy(line.replace(/^(장소|위치|주소)\s*[:：]?\s*/, ""));
    } else {
      // 한 줄: 대회명·날짜·상금·링크를 빼고 남은 글이 장소입니다.
      let rest = text;
      for (const part of [...used, out.link].filter(Boolean)) rest = rest.replace(part, " ");
      rest = tidy(rest.replace(new RegExp(`(${ANY_LABEL})\\s*[:：]`, "g"), " "));
      if (rest && rest.length <= 80) out.location = rest;
    }
  }
  out.location = out.location.slice(0, 120);
  return out;
}
