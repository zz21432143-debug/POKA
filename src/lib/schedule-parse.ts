import { parseDateList } from "@/lib/job-parse";

/**
 * 대회 안내 글(카톡·인스타·홈페이지에서 복사한 글)을 붙여넣으면 대회 캘린더 칸으로 나눕니다. AI를 쓰지 않아 비용이 없습니다.
 * "대회명:", "장소:", "일시:", "총상금:" 같은 머리말이 있으면 그 값을, 없으면 날짜·상금·주소처럼 보이는 줄을 찾아 씁니다.
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

const LABEL = {
  title: /^(대회\s*명|대회\s*이름|이벤트\s*명|행사\s*명|title|event)$/i,
  location: /^(장소|개최\s*장소|개최지|위치|주소|venue|location)$/i,
  date: /^(일시|일정|기간|날짜|대회\s*일정|대회\s*기간|개최\s*일|date|dates)$/i,
  prize: /^(총\s*상금|상금|보장\s*상금|프라이즈|prize|gtd|guarantee)$/i,
};

function stripBullet(line: string) {
  return line.replace(/^[\s•·\-*▶►▪︎◆◇■□○●✔✓☑️👉📍📅🏆💰🗓️⏰]+/u, "").trim();
}

/** "키 : 값" → [키, 값] */
function splitLabel(line: string): [string, string] | null {
  const m = stripBullet(line).match(/^([^:：]{1,12})\s*[:：]\s*(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : null;
}

/** "2026.11.14 - 11.16", "11.14(토)~16(월)" 같은 점 표기도 날짜로 읽게 바꿉니다. */
function normalizeDates(text: string) {
  return text
    .replace(/(\d{4})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{1,2})\.?/g, "$1년 $2월 $3일")
    .replace(/(?<![\d년])(\d{1,2})\.(\d{1,2})(?!\d)/g, "$1/$2")
    .replace(/\([월화수목금토일]\)/g, "")
    .replace(/\s*(-|–|—|~|부터)\s*/g, "~");
}

function datesFrom(text: string, today: string) {
  const dates = parseDateList(normalizeDates(text), today);
  return { start: dates[0] ?? "", end: dates[dates.length - 1] ?? "" };
}

export function parseScheduleText(raw: string, today: string): ParsedSchedule {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: ParsedSchedule = { title: "", location: "", startDate: "", endDate: "", totalPrize: "", link: "", description: text };

  // 1) 머리말이 붙은 줄
  for (const line of lines) {
    const pair = splitLabel(line);
    if (!pair) continue;
    const [key, value] = pair;
    if (!out.title && LABEL.title.test(key)) out.title = value;
    else if (!out.location && LABEL.location.test(key)) out.location = value;
    else if (!out.startDate && LABEL.date.test(key)) {
      const { start, end } = datesFrom(value, today);
      out.startDate = start;
      out.endDate = end;
    } else if (!out.totalPrize && LABEL.prize.test(key)) out.totalPrize = value;
  }

  // 2) 대회명: 【 】·[ ]·⚜️ 로 감싼 줄, 없으면 첫 줄
  if (!out.title) {
    const bracket = text.match(/【\s*([^】]+?)\s*】/) ?? text.match(/^\s*\[\s*([^\]\n]{2,40})\s*\]\s*$/m);
    out.title = (bracket?.[1] ?? stripBullet(lines[0] ?? "")).slice(0, 80);
  }

  // 3) 날짜: 머리말이 없으면 날짜가 있는 첫 줄(모집 마감·접수 줄은 제외)
  if (!out.startDate) {
    for (const line of lines) {
      if (/(마감|접수|신청|발표)/.test(line)) continue;
      const { start, end } = datesFrom(stripBullet(line), today);
      if (start) {
        out.startDate = start;
        out.endDate = end;
        break;
      }
    }
  }
  if (out.endDate && out.startDate && out.endDate < out.startDate) out.endDate = out.startDate;
  if (!out.endDate) out.endDate = out.startDate;

  // 4) 상금: GTD·보장·상금·억/만원 금액이 있는 줄
  if (!out.totalPrize) {
    const line = lines.find((l) => /(GTD|보장|상금|prize)/i.test(l) && /(\d|억|만)/.test(l));
    if (line) out.totalPrize = (splitLabel(line)?.[1] ?? stripBullet(line)).slice(0, 60);
  }

  // 5) 장소: 시/구/로/길 주소나 호텔·홀·센터·펍 같은 장소 이름이 있는 줄
  if (!out.location) {
    const line = lines.find(
      (l) =>
        l !== lines[0] &&
        !/(GTD|보장|상금|\d{1,2}\s*[월/.]\s*\d{1,2})/i.test(l) &&
        /((시|구|군|로|길)\s*\d|호텔|홀\b|센터|컨벤션|펍|라운지|타워|빌딩|\d+\s*층)/.test(l),
    );
    if (line) out.location = (splitLabel(line)?.[1] ?? stripBullet(line)).slice(0, 120);
  }

  out.link = text.match(/https?:\/\/[^\s<>"')\]]+/)?.[0] ?? "";
  return out;
}
