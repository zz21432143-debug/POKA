import type { JobRegion } from "@/lib/job-status";
import { addDays, normalizeJobEvents, type JobEvent } from "@/lib/job-events";
import { detectTax, type JobTax } from "@/lib/job-tax";

/**
 * 카톡 오픈채팅방에 올라오는 구인 공고 글을 붙여넣으면 글쓰기 칸을 자동으로 채웁니다.
 * 운영 중인 공고 양식(【 행사명 】, • 일정 - 인원, 시급 : 20,000원 (6시간 보장), 근무복장, 문자지원, 구글폼 링크 등)을 기준으로 합니다.
 * 못 찾은 칸은 비워 두고, 원문은 본문(content)에 그대로 들어갑니다.
 */
export type ParsedJob = {
  companyName: string | null;
  region: JobRegion | null;
  address: string | null;
  workDate: string | null;
  endDate: string | null;
  deadline: string | null;
  alwaysOpen: boolean;
  schedule: string | null;
  /** 날짜별 일정(행사명·인원). 기간(12/23~12/27)은 하루씩 풀어 넣습니다. */
  events: JobEvent[];
  headcount: string | null;
  payType: string | null;
  payAmount: string | null;
  guaranteedHours: string | null;
  workHours: string | null;
  benefits: string | null;
  travelPay: boolean;
  travelPayAmount: string | null;
  /** 3.3% 공제 여부(원문에서 찾은 경우) */
  taxDeduction: JobTax | null;
  dressCode: string | null;
  experience: string | null;
  applyMethod: string | null;
  applyLink: string | null;
  contact: string | null;
  content: string;
};

const REGION_ALIASES: [RegExp, JobRegion][] = [
  [/서울(특별시|시)?/, "서울"],
  [/경기(도)?/, "경기"],
  [/인천(광역시|시)?/, "인천"],
  [/부산(광역시|시)?/, "부산"],
  [/대구(광역시|시)?/, "대구"],
  [/대전(광역시|시)?/, "대전"],
  [/광주(광역시)/, "광주"],
  [/울산(광역시|시)?/, "울산"],
  [/세종(특별자치시|시)/, "세종"],
  [/강원(특별자치도|도)?/, "강원"],
  [/충(청)?북(도)?/, "충북"],
  [/충(청)?남(도)?/, "충남"],
  [/전(라)?북(도|특별자치도)?/, "전북"],
  [/전(라)?남(도)?/, "전남"],
  [/경(상)?북(도)?/, "경북"],
  [/경(상)?남(도)?/, "경남"],
  [/제주(특별자치도|도|시)?/, "제주"],
];

/** 주소 없이 동네 이름만 있을 때 쓰는 지역 추정표 */
const PLACE_REGION: Record<string, JobRegion> = {
  강남: "서울", 역삼: "서울", 서초: "서울", 송파: "서울", 잠실: "서울", 홍대: "서울", 신촌: "서울",
  마포: "서울", 구로: "서울", 영등포: "서울", 여의도: "서울", 건대: "서울", 광진: "서울", 종로: "서울",
  성수: "서울", 강서: "서울", 노원: "서울", 신림: "서울", 관악: "서울", 동대문: "서울", 압구정: "서울",
  부평: "인천", 계양: "인천", 연수: "인천", 송도: "인천", 남동: "인천", 미추홀: "인천", 구월: "인천",
  김포: "경기", 부천: "경기", 수원: "경기", 성남: "경기", 분당: "경기", 판교: "경기", 일산: "경기",
  고양: "경기", 안양: "경기", 의정부: "경기", 평택: "경기", 용인: "경기", 화성: "경기", 동탄: "경기",
  안산: "경기", 시흥: "경기", 파주: "경기", 광명: "경기", 하남: "경기", 남양주: "경기", 구리: "경기",
  해운대: "부산", 서면: "부산", 광안리: "부산", 동성로: "대구", 둔산: "대전", 천안: "충남", 청주: "충북",
  창원: "경남", 김해: "경남", 포항: "경북", 전주: "전북", 춘천: "강원", 원주: "강원", 서귀포: "제주",
};

const PHONE_RE = /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g;
const LINK_RE = /https?:\/\/[^\s)\]]+/g;
// "10월 31일", "2026년 12월 23일", "12/23" 모두 받습니다.
const DATE_RE = /(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일|(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/g;

const pad = (n: number) => String(n).padStart(2, "0");

function stripBullet(line: string) {
  return line.replace(/^[\s•·\-*▶►▪︎◆◇■□○●✔✓☑️👉]+/u, "").trim();
}

/** 연도가 없으면 오늘 기준 가까운 미래로 봅니다(지난 달이면 내년). */
function toIso(year: number | null, month: number, day: number, today: string): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year) return `${year}-${pad(month)}-${pad(day)}`;
  const thisYear = Number(today.slice(0, 4));
  const candidate = `${thisYear}-${pad(month)}-${pad(day)}`;
  const monthAgo = `${thisYear}-${pad(Number(today.slice(5, 7)))}-01`;
  return candidate < monthAgo ? `${thisYear + 1}-${pad(month)}-${pad(day)}` : candidate;
}

function datesIn(line: string, today: string): string[] {
  const out: string[] = [];
  let lastYear: number | null = null;
  let lastMonth: number | null = null;
  for (const m of line.matchAll(DATE_RE)) {
    const year: number | null = m[1] ? Number(m[1]) : lastYear;
    const month = Number(m[2] ?? m[4]);
    const day = Number(m[3] ?? m[5]);
    const iso = toIso(year, month, day, today);
    if (iso) out.push(iso);
    lastYear = year;
    lastMonth = month;
  }
  // "12월 23일 ~ 27일"처럼 끝에 월이 빠진 범위
  const tail = line.match(/~\s*(\d{1,2})\s*일/);
  if (tail && lastMonth && out.length === 1 && !/~\s*\d{1,2}\s*월/.test(line)) {
    const iso = toIso(lastYear, lastMonth, Number(tail[1]), today);
    if (iso) out.push(iso);
  }
  return out;
}

/** 글에서 가장 먼저 나오는 광역 지역(서울특별시, 경기도 …) */
function regionOf(text: string): JobRegion | null {
  let best: { at: number; region: JobRegion } | null = null;
  for (const [re, region] of REGION_ALIASES) {
    const m = new RegExp(`(^|[^가-힣])${re.source}`).exec(text);
    if (m && (!best || m.index < best.at)) best = { at: m.index, region };
  }
  return best?.region ?? null;
}

/** 동네 이름(부평, 김포 …) 중 글에서 가장 먼저 나오는 것의 지역 */
function placeRegion(text: string): JobRegion | null {
  let best: { at: number; region: JobRegion } | null = null;
  for (const [place, region] of Object.entries(PLACE_REGION)) {
    const at = text.indexOf(place);
    if (at >= 0 && (!best || at < best.at)) best = { at, region };
  }
  return best?.region ?? null;
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

function wonDigits(raw: string): string | null {
  const man = raw.match(/(\d+(?:\.\d+)?)\s*만\s*원?/);
  if (man) return String(Math.round(Number(man[1]) * 10000));
  const digits = raw.match(/\d[\d,]*/);
  const value = digits ? digits[0].replace(/,/g, "") : "";
  // 양식의 "00,000원"처럼 0이면 비워 둡니다.
  return Number(value) > 0 ? String(Number(value)) : null;
}

/** "키 : 값" 줄의 값. 키 뒤 콜론이 없으면 null. */
function valueAfter(line: string, key: RegExp): string | null {
  const m = stripBullet(line).match(new RegExp(`^${key.source}\\s*[:：]\\s*(.*)$`));
  return m ? m[m.length - 1].trim() : null;
}

/** 머리말 줄(복지사항, 근무복장 등) 아래 이어지는 줄들. 빈 줄이나 다음 머리말에서 끊습니다. */
function sectionAfter(lines: string[], header: RegExp): string[] {
  const start = lines.findIndex((l) => header.test(stripBullet(l).replace(/[\[\]【】]/g, "")) && !/[:：]\s*\S/.test(l));
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim()) {
      if (out.length > 0) break;
      continue;
    }
    if (/^\s*\[.+\]\s*$/.test(raw)) break;
    out.push(stripBullet(raw));
  }
  return out;
}

/** 시작~끝 날짜를 하루씩 펼칩니다(최대 31일). */
function expandRange(start: string, end: string): string[] {
  if (end <= start) return [start];
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 31; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * 손으로 친 날짜를 읽습니다. "10/31", "10월 31일", "1031", "2026-10-31".
 * 여러 개는 쉼표·띄어쓰기로, 기간은 "12/23~12/27"처럼 물결로 씁니다. 연도가 없으면 가까운 미래로 봅니다.
 */
export function parseDateList(text: string, today: string): string[] {
  const normalized = text
    .replace(/(\d{4})-(\d{1,2})-(\d{1,2})/g, "$1년 $2월 $3일")
    .replace(/(?<![\d/])(\d{2})(\d{2})(?![\d/])/g, (all, m: string, d: string) =>
      Number(m) >= 1 && Number(m) <= 12 ? `${Number(m)}/${Number(d)}` : all,
    )
    .replace(/\s*~\s*/g, "~");
  const out: string[] = [];
  for (const part of normalized.split(/[,\n]|(?<!년)\s+(?=\d+\s*[/월])/)) {
    const found = datesIn(part, today);
    if (found.length === 2 && /~/.test(part)) out.push(...expandRange(found[0], found[1]));
    else out.push(...found);
  }
  return [...new Set(out)].sort();
}

export function parseJobPost(raw: string, today: string): ParsedJob {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  const lines = text.split("\n");
  const plain = lines.map(stripBullet);

  // 행사명/상호명/팀명: 【 … 】 또는 ⚜️ … ⚜️
  let companyName: string | null = null;
  const bracket = text.match(/【\s*([^】]+?)\s*】/) ?? text.match(/⚜️\s*([^⚜\n]+?)\s*⚜️/);
  if (bracket) {
    companyName = bracket[1]
      .replace(/^20\d{2}\s*(년)?\s*/, "")
      .replace(/\s*(공개\s*)?(모집|구인|채용)\s*$/, "")
      .trim();
  } else {
    companyName = plain.find((l) => l.length > 0 && l.length <= 30) ?? null;
  }

  // 마감·결과 안내 줄은 근무 날짜에서 뺍니다.
  let deadline: string | null = null;
  const workDates: string[] = [];
  const scheduleRows: string[] = [];
  const eventRows: JobEvent[] = [];
  let headTotal = 0;
  let headPlus = false;
  let headcount: string | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = plain[i];
    const found = datesIn(line, today);
    if (found.length === 0) continue;
    if (/마감/.test(line)) {
      deadline = found[found.length - 1];
      continue;
    }
    if (/(결과|발표|안내|합격)/.test(line)) continue;
    workDates.push(...found);
    // 행사 제목은 날짜 바로 윗줄(• MAIN EVENT)에 있습니다.
    const prev = i > 0 ? plain[i - 1] : "";
    const title =
      prev && /^\s*[•·\-*]/.test(lines[i - 1]) && !/[:：]/.test(prev) && datesIn(prev, today).length === 0 ? prev : "";
    const dateText = (valueAfter(line, /(날짜|일정|일시|근무일)/) ?? line).replace(/\s+/g, " ");
    scheduleRows.push(title ? `${title} · ${dateText}` : dateText);
    const people = line.match(/(\d+)\s*명\s*(\+\s*@)?/);
    // 양식의 "00명"처럼 0인 값은 비워 둡니다.
    const dayHead = people && Number(people[1]) > 0 ? `${Number(people[1])}명${people[2] ? "+@" : ""}` : "";
    const days = found.length === 2 && /~/.test(line) ? expandRange(found[0], found[1]) : found;
    days.forEach((date, n) =>
      eventRows.push({ date, ...(title ? { name: title } : {}), ...(dayHead && n === 0 ? { headcount: dayHead } : {}) }),
    );
    if (people) {
      headTotal += Number(people[1]);
      if (people[2]) headPlus = true;
    }
  }
  const headLine = plain.map((l) => valueAfter(l, /(모집\s*인원|인원)/)).find(Boolean);
  if (headLine) {
    headcount = headLine.replace(/\s+/g, "");
  } else if (headTotal > 0) {
    headcount = `${headTotal}명${headPlus ? "+@" : ""}`;
  }
  const sortedDates = [...new Set(workDates)].sort();
  const workDate = sortedDates[0] ?? null;
  const endDate = sortedDates.length > 1 ? sortedDates[sortedDates.length - 1] : null;

  // 장소·지역
  let address: string | null = null;
  const placeIdx = plain.findIndex((l) => valueAfter(l, /(장소|근무지|위치|주소)/) !== null);
  if (placeIdx >= 0) {
    const parts = [valueAfter(plain[placeIdx], /(장소|근무지|위치|주소)/) ?? ""];
    const next = plain[placeIdx + 1] ?? "";
    if (next && !/[:：]/.test(next) && /(시|도|구|군|로|길)\s*\d|\d+\s*(층|호)/.test(next)) parts.push(next);
    address = parts.filter(Boolean).join(" · ") || null;
  }
  let region = address ? regionOf(address) ?? placeRegion(address) : null;
  if (!region) region = regionOf(text.replace(/【[^】]*】/g, "")) ?? null;
  if (!address) {
    // 주소가 없으면 행사 제목에 나온 동네 이름들로 대신합니다(예: 부평 · 김포).
    const rows = scheduleRows.join(" ");
    const places = Object.keys(PLACE_REGION)
      .filter((p) => rows.includes(p))
      .sort((x, y) => rows.indexOf(x) - rows.indexOf(y));
    if (places.length > 0) address = places.join(" · ");
  }
  if (!region) {
    const where = [address ?? "", ...scheduleRows].join(" ");
    region = placeRegion(where);
  }

  // 급여
  let payType: string | null = null;
  let payAmount: string | null = null;
  let guaranteedHours: string | null = null;
  for (const line of plain) {
    const m = line.match(/(시급|일급|월급|주급|연봉|건당)\s*[:：]?\s*([\d,.]+\s*만?\s*원?)/);
    if (m) {
      payType = m[1];
      payAmount = wonDigits(m[2]);
      const g = line.match(/(\d+(?:\.\d+)?)\s*시간\s*보장/);
      if (g && Number(g[1]) > 0) guaranteedHours = `${g[1]}시간`;
      break;
    }
  }
  if (!guaranteedHours) {
    const g = text.match(/(\d+(?:\.\d+)?)\s*시간\s*보장/);
    if (g && Number(g[1]) > 0) guaranteedHours = `${g[1]}시간`;
  }

  const workHoursLine = plain.map((l) => valueAfter(l, /(출근\s*시간|근무\s*시간)/)).find(Boolean) ?? null;
  const workHours = workHoursLine ? (/출근/.test(text) && /추후/.test(workHoursLine) ? `출근 ${workHoursLine}` : workHoursLine) : null;

  // 복지
  const benefitItems: string[] = [];
  const inlineBenefit = plain.map((l) => valueAfter(l, /(복지\s*사항|복리\s*후생|복지|혜택)/)).find(Boolean);
  if (inlineBenefit) benefitItems.push(...inlineBenefit.split(/\s*\/\s*/));
  benefitItems.push(...sectionAfter(lines, /^(복지\s*사항|복리\s*후생|복지|혜택)$/));
  const benefitClean = benefitItems
    .map((b) => b.replace(/\s*[:：]\s*/, " ").trim())
    .filter((b) => b && !/(경력|숙지|가능자|복장|상의|하의)/.test(b));
  const benefits = benefitClean.length > 0 ? benefitClean.join(", ") : null;
  const travel = benefitClean.find((b) => /(교통비|차비)/.test(b));
  const travelPay = Boolean(travel);
  const travelPayAmount = travel ? wonDigits(travel.replace(/^.*?(교통비|차비)/, "")) : null;

  // 근무복장
  const dressParts = plain
    .map((l) => l.match(/^(상의|하의|신발)\s*[:：]\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => `${m[1]} ${m[2].trim()}`);
  const dressCode = dressParts.length > 0 ? dressParts.join(" · ") : null;

  // 자격·우대 조건: "~자", "~분"으로 끝나는 짧은 줄
  const reqs = plain.filter(
    (l) =>
      l.length > 1 &&
      l.length <= 40 &&
      /(자|분)$/.test(l) &&
      !/[:：/,]/.test(l) &&
      !/(감사|기다립|희망합|지원 방법)/.test(l),
  );
  const experience = reqs.length > 0 ? reqs.join(", ") : null;

  // 지원 방법
  const links = text.match(LINK_RE) ?? [];
  const applyLink = links[0] ?? null;
  let applyMethod: string | null = null;
  const smsIdx = plain.findIndex((l) => /문자\s*(로\s*)?지원/.test(l));
  if (smsIdx >= 0) {
    const same = plain[smsIdx];
    const header = /^문자\s*지원$/.test(same);
    const formLine = header ? plain[smsIdx + 1] : plain[smsIdx - 1];
    const form = formLine && /[\/,]/.test(formLine) ? formLine.replace(/\s+/g, "") : null;
    applyMethod = form ? `문자 지원 (${form})` : "문자 지원";
  } else if (applyLink) {
    applyMethod = /forms\.gle|google\.com\/forms/.test(applyLink) ? "구글폼 지원서" : "지원서 링크";
  }

  // 연락처: 전화번호 앞뒤의 이름
  const contacts: string[] = [];
  for (const line of plain) {
    for (const m of line.matchAll(PHONE_RE)) {
      const before = line.slice(0, m.index).match(/([가-힣]{2,4})\s*[:：]?\s*$/);
      const after = line.slice((m.index ?? 0) + m[0].length).match(/^\s*([가-힣]{2,4})/);
      const name = before?.[1] ?? after?.[1] ?? null;
      const phone = formatPhone(m[0]);
      contacts.push(name && !/(문의|연락|지원|전화)/.test(name) ? `${name} ${phone}` : phone);
    }
  }
  const contact = contacts.length > 0 ? [...new Set(contacts)].join(", ") : null;

  const alwaysOpen = /상시\s*(모집|채용)/.test(text);

  return {
    companyName: companyName || null,
    region,
    address,
    workDate,
    endDate,
    deadline,
    alwaysOpen,
    schedule: scheduleRows.length > 0 ? scheduleRows.join(" / ") : null,
    events: normalizeJobEvents(eventRows),
    headcount,
    payType,
    payAmount,
    guaranteedHours,
    workHours,
    benefits,
    travelPay,
    travelPayAmount,
    taxDeduction: detectTax(text),
    dressCode,
    experience,
    applyMethod,
    applyLink,
    contact,
    content: text,
  };
}

