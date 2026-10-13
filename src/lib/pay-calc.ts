/**
 * 딜러 급여 계산(DB 없이 계산만).
 *
 * - 근무: 날짜 · 출근 · 퇴근 · 휴게(분). 퇴근이 출근보다 이르면 다음 날 새벽(밤샘)으로 봅니다.
 * - 시급제: 일한 시간 × 시급. 일당제: 근무 한 번에 일당.
 * - 야간 가산(선택): 22:00~06:00에 일한 시간은 시급의 50%를 더 줍니다(시급제만).
 * - 3.3% 공제: 소득세 3% + 지방소득세 0.3%(각각 10원 미만 버림). 프리랜서·사업소득.
 * - 4대보험 공제(근로자 부담분): 국민연금 · 건강보험 · 장기요양(건강보험료의 일정 비율) · 고용보험(각각 10원 미만 버림).
 *   요율은 해마다 바뀌므로 화면에서 고칠 수 있습니다. 실제 공제액은 회사 신고 기준(보수월액 등)에 따라 다를 수 있습니다.
 */

export type PayShift = {
  /** "2026-10-13" */
  date: string;
  /** "18:00" */
  start: string;
  /** "02:00" (출근보다 이르면 다음 날) */
  end: string;
  /** 휴게 시간(분) */
  breakMinutes: number;
};

export type InsuranceRates = {
  /** 국민연금 근로자 부담(%) */
  pension: number;
  /** 건강보험 근로자 부담(%) */
  health: number;
  /** 장기요양: 건강보험료의 %(예: 13.14) */
  care: number;
  /** 고용보험 근로자 부담(%) */
  employment: number;
};

/** 2026년 근로자 부담 요율(기본값). 바뀌면 화면에서 고치세요. */
export const DEFAULT_RATES: InsuranceRates = { pension: 4.75, health: 3.595, care: 13.14, employment: 0.9 };

export type PayOptions = {
  shifts: PayShift[];
  /** "hourly" 시급제 · "daily" 일당제 */
  mode: "hourly" | "daily";
  /** 시급 또는 일당(원) */
  amount: number;
  /** 야간(22~06시) 50% 가산(시급제만) */
  night: boolean;
  deduct33: boolean;
  deductInsurance: boolean;
  rates?: InsuranceRates;
};

export type ShiftResult = { minutes: number; nightMinutes: number; valid: boolean };

export type PayResult = {
  shifts: ShiftResult[];
  workDays: number;
  totalMinutes: number;
  nightMinutes: number;
  basePay: number;
  nightPay: number;
  gross: number;
  tax: { income: number; local: number; total: number };
  insurance: { pension: number; health: number; care: number; employment: number; total: number };
  deductions: number;
  net: number;
};

function clockToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 10원 미만 버림 */
const floor10 = (n: number) => Math.floor(n / 10) * 10;

/** 근무 하나: 일한 분(휴게 뺌) · 야간(22~06시) 분 */
export function shiftMinutes(shift: PayShift): ShiftResult {
  const start = clockToMinutes(shift.start);
  let end = clockToMinutes(shift.end);
  if (start == null || end == null) return { minutes: 0, nightMinutes: 0, valid: false };
  if (end <= start) end += 1440;
  const span = end - start;
  const rest = Math.max(0, Math.min(span, Math.floor(shift.breakMinutes || 0)));
  const minutes = span - rest;
  // 야간: [22:00, 30:00) 과 [-2:00(전날 22시), 06:00) 구간과 겹친 시간. 휴게는 야간이 아닌 시간에서 먼저 뺀다고 보지 않고, 일한 시간을 넘지 않게만 맞춥니다.
  const overlap = (a: number, b: number) => Math.max(0, Math.min(end as number, b) - Math.max(start, a));
  const night = overlap(-120, 360) + overlap(1320, 1800) + overlap(2760, 3240);
  return { minutes, nightMinutes: Math.min(night, minutes), valid: true };
}

export function calcPay(options: PayOptions): PayResult {
  const rates = options.rates ?? DEFAULT_RATES;
  const amount = Math.max(0, Number(options.amount) || 0);
  const shifts = options.shifts.map(shiftMinutes);
  const valid = shifts.filter((s) => s.valid && s.minutes > 0);
  const totalMinutes = valid.reduce((sum, s) => sum + s.minutes, 0);
  const nightMinutes = valid.reduce((sum, s) => sum + s.nightMinutes, 0);
  const workDays = valid.length;
  const basePay = Math.round(options.mode === "daily" ? amount * workDays : (amount * totalMinutes) / 60);
  const nightPay = options.mode === "hourly" && options.night ? Math.round((amount * 0.5 * nightMinutes) / 60) : 0;
  const gross = basePay + nightPay;

  const income = options.deduct33 ? floor10(gross * 0.03) : 0;
  const local = options.deduct33 ? floor10(income * 0.1) : 0;
  const tax = { income, local, total: income + local };

  let insurance = { pension: 0, health: 0, care: 0, employment: 0, total: 0 };
  if (options.deductInsurance) {
    const pension = floor10((gross * rates.pension) / 100);
    const health = floor10((gross * rates.health) / 100);
    const care = floor10((health * rates.care) / 100);
    const employment = floor10((gross * rates.employment) / 100);
    insurance = { pension, health, care, employment, total: pension + health + care + employment };
  }
  const deductions = tax.total + insurance.total;
  return { shifts, workDays, totalMinutes, nightMinutes, basePay, nightPay, gross, tax, insurance, deductions, net: gross - deductions };
}

export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
export const hoursText = (minutes: number) => `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ""}`;

/** 단톡방·메모용 결과 글 */
export function payText(options: PayOptions, result: PayResult, title = "급여 계산") {
  const lines = [`【 ${title} 】`];
  lines.push(`근무 ${result.workDays}일 · ${hoursText(result.totalMinutes)}${result.nightMinutes && options.night ? ` (야간 ${hoursText(result.nightMinutes)})` : ""}`);
  lines.push(options.mode === "daily" ? `일당 ${won(options.amount)} × ${result.workDays}일 = ${won(result.basePay)}` : `시급 ${won(options.amount)} → 기본 ${won(result.basePay)}`);
  if (result.nightPay) lines.push(`야간 가산 ${won(result.nightPay)}`);
  lines.push(`세전 합계 ${won(result.gross)}`);
  if (options.deduct33) lines.push(`3.3% 공제 -${won(result.tax.total)} (소득세 ${won(result.tax.income)} · 지방소득세 ${won(result.tax.local)})`);
  if (options.deductInsurance) {
    const i = result.insurance;
    lines.push(`4대보험 공제 -${won(i.total)} (국민연금 ${won(i.pension)} · 건강 ${won(i.health)} · 장기요양 ${won(i.care)} · 고용 ${won(i.employment)})`);
  }
  lines.push(`실수령 ${won(result.net)}`);
  lines.push("- POKA 홀덤 커뮤니티 · pokerwiki.co.kr");
  return lines.join("\n");
}
