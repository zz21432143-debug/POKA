"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "cn";
import { DEFAULT_RATES, calcPay, hoursText, payText, won, type InsuranceRates, type PayOptions, type PayShift } from "@/lib/pay-calc";
import { kstDate } from "@/lib/rotation";
import { BRAND_FONT, FOOTER_H, drawCredit, drawLogo, loadLogo, saveCanvas } from "@/components/tools/brand-canvas";

/** 입력은 이 기기에만 저장(다른 사람·서버에는 안 보냄) */
const STORE_KEY = "poka-pay-calc-v1";

type Saved = { title: string; mode: PayOptions["mode"]; amount: string; deduct33: boolean; deductInsurance: boolean; rates: InsuranceRates; shifts: PayShift[] };

const emptyShift = (date = kstDate()): PayShift => ({ date, start: "18:00", end: "02:00", breakMinutes: 0 });

function defaults(): Saved {
  return {
    title: "급여 계산",
    mode: "hourly",
    amount: "",
    deduct33: true,
    deductInsurance: false,
    rates: DEFAULT_RATES,
    shifts: [emptyShift()],
  };
}

/** 결과 이미지(POKA 로고·출처 포함) */
async function downloadPayImage(text: string, title: string) {
  const logo = await loadLogo();
  const lines = text.split("\n").slice(1, -1);
  const width = 640;
  const lineH = 40;
  const height = 110 + lines.length * lineH + 20 + FOOTER_H;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#fbbf24";
  ctx.font = `900 34px ${BRAND_FONT}`;
  ctx.fillText(title, 24, 58);
  drawLogo(ctx, logo, width - 84, 10, 72);
  lines.forEach((line, i) => {
    const y = 120 + i * lineH;
    const last = line.startsWith("실수령");
    ctx.fillStyle = i % 2 ? "#141417" : "#1c1c20";
    ctx.fillRect(12, y - 28, width - 24, lineH - 4);
    ctx.fillStyle = last ? "#34d399" : line.includes("공제") ? "#fb7185" : "#ffffff";
    ctx.font = `${last ? 900 : 700} ${last ? 22 : 16}px ${BRAND_FONT}`;
    ctx.fillText(line.length > 52 ? `${line.slice(0, 52)}…` : line, 24, y);
  });
  drawCredit(ctx, width, height);
  saveCanvas(canvas, `${title.replace(/[\\/:*?"<>|\s]+/g, "_")}.png`);
}

/** 딜러 급여 계산기: 근무 기록 → 세전 · 3.3% · 4대보험 · 실수령 */
export function PayCalculator() {
  const [data, setData] = useState<Saved>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // 이 기기에 저장해 둔 입력 불러오기(없거나 못 읽어도 화면은 그대로)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 값은 화면이 뜬 뒤에만 읽을 수 있습니다.
      if (raw) setData({ ...defaults(), ...(JSON.parse(raw) as Partial<Saved>) });
    } catch {
      /* 저장소를 못 쓰면 새로 입력 */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {
      /* 무시 */
    }
  }, [data, loaded]);

  const options: PayOptions = useMemo(
    () => ({
      shifts: data.shifts,
      mode: data.mode,
      amount: Number(data.amount.replace(/[^\d]/g, "")) || 0,
      deduct33: data.deduct33,
      deductInsurance: data.deductInsurance,
      rates: data.rates,
    }),
    [data],
  );
  const result = useMemo(() => calcPay(options), [options]);
  const text = payText(options, result, data.title || "급여 계산");
  const set = (patch: Partial<Saved>) => setData((d) => ({ ...d, ...patch }));
  const setShift = (index: number, patch: Partial<PayShift>) => set({ shifts: data.shifts.map((s, i) => (i === index ? { ...s, ...patch } : s)) });

  return (
    <div className="grid gap-4 text-white">
      {/* 1. 급여 방식 */}
      <section className="grid gap-3 rounded-2xl border border-white/15 bg-zinc-950 p-3 sm:p-4">
        <h2 className="text-lg font-black">1. 급여 방식</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex rounded-full border border-white/20 p-0.5">
            {(["hourly", "daily"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => set({ mode })}
                className={cn("min-h-10 rounded-full px-4 text-sm font-black", data.mode === mode ? "bg-amber-400 text-black" : "text-zinc-300")}
              >
                {mode === "hourly" ? "시급제" : "일당제"}
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-xs font-bold text-zinc-300">
            {data.mode === "hourly" ? "시급(원)" : "일당(원)"}
            <input
              inputMode="numeric"
              value={data.amount}
              placeholder={data.mode === "hourly" ? "예: 15000" : "예: 150000"}
              onChange={(e) => set({ amount: e.target.value.replace(/[^\d]/g, "") })}
              className="h-11 w-40 rounded-lg border border-white/20 bg-black px-2 text-lg font-black"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-zinc-300">
            제목(복사·이미지에 나옴)
            <input value={data.title} maxLength={30} onChange={(e) => set({ title: e.target.value })} className="h-11 w-52 rounded-lg border border-white/20 bg-black px-2 text-base font-bold" />
          </label>
        </div>
      </section>

      {/* 2. 근무 기록 */}
      <section className="grid gap-2 rounded-2xl border border-white/15 bg-zinc-950 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black">2. 근무 기록</h2>
          <span className="text-xs text-zinc-400">퇴근이 출근보다 이르면 다음 날 새벽으로 계산합니다.</span>
        </div>
        <ul className="grid gap-1.5">
          {data.shifts.map((shift, index) => {
            const r = result.shifts[index];
            return (
              <li key={index} data-shift={index} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-black px-2 py-1.5">
                <input type="date" aria-label="날짜" value={shift.date} onChange={(e) => setShift(index, { date: e.target.value })} className="h-10 rounded-lg border border-white/20 bg-zinc-900 px-1.5 text-sm" />
                <label className="flex items-center gap-1 text-xs font-bold text-zinc-400">
                  출근
                  <input type="time" aria-label="출근" value={shift.start} onChange={(e) => setShift(index, { start: e.target.value })} className="h-10 rounded-lg border border-white/20 bg-zinc-900 px-1.5 text-sm text-white" />
                </label>
                <label className="flex items-center gap-1 text-xs font-bold text-zinc-400">
                  퇴근
                  <input type="time" aria-label="퇴근" value={shift.end} onChange={(e) => setShift(index, { end: e.target.value })} className="h-10 rounded-lg border border-white/20 bg-zinc-900 px-1.5 text-sm text-white" />
                </label>
                <label className="flex items-center gap-1 text-xs font-bold text-zinc-400">
                  휴게
                  <input
                    inputMode="numeric"
                    aria-label="휴게(분)"
                    value={shift.breakMinutes || ""}
                    placeholder="0"
                    onChange={(e) => setShift(index, { breakMinutes: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })}
                    className="h-10 w-14 rounded-lg border border-white/20 bg-zinc-900 px-1.5 text-sm text-white"
                  />
                  분
                </label>
                <span className={cn("text-sm font-black tabular-nums", r?.valid ? "text-emerald-300" : "text-rose-300")}>
                  {r?.valid ? hoursText(r.minutes) : "시간 확인"}
                </span>
                <button
                  type="button"
                  onClick={() => set({ shifts: data.shifts.filter((_, i) => i !== index) })}
                  disabled={data.shifts.length === 1}
                  className="ml-auto min-h-9 rounded px-2 text-xs font-bold text-zinc-400 hover:bg-white/10 disabled:opacity-30"
                >
                  삭제
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const last = data.shifts[data.shifts.length - 1];
              const next = last ? new Date(`${last.date}T00:00:00Z`) : null;
              if (next) next.setUTCDate(next.getUTCDate() + 1);
              set({ shifts: [...data.shifts, last ? { ...last, date: next ? next.toISOString().slice(0, 10) : kstDate() } : emptyShift()] });
            }}
            disabled={data.shifts.length >= 62}
            className="min-h-10 rounded-lg bg-emerald-500 px-4 text-sm font-black text-black disabled:opacity-40"
          >
            + 근무 추가(다음 날)
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("근무 기록을 모두 지울까요?")) set({ shifts: [emptyShift()] });
            }}
            className="min-h-10 rounded-lg border border-white/25 px-3 text-sm font-bold"
          >
            기록 비우기
          </button>
        </div>
      </section>

      {/* 3. 공제 */}
      <section className="grid gap-2 rounded-2xl border border-white/15 bg-zinc-950 p-3 sm:p-4">
        <h2 className="text-lg font-black">3. 공제</h2>
        <label className="flex items-center gap-2 text-base font-bold">
          <input type="checkbox" checked={data.deduct33} onChange={(e) => set({ deduct33: e.target.checked })} className="size-5" />
          3.3% 공제 <span className="text-xs text-zinc-400">(소득세 3% + 지방소득세 0.3% · 프리랜서·알바)</span>
        </label>
        <label className="flex items-center gap-2 text-base font-bold">
          <input type="checkbox" checked={data.deductInsurance} onChange={(e) => set({ deductInsurance: e.target.checked })} className="size-5" />
          4대보험 공제 <span className="text-xs text-zinc-400">(국민연금·건강·장기요양·고용 · 근로자 부담분)</span>
        </label>
        {data.deduct33 && data.deductInsurance ? (
          <p className="rounded-lg bg-amber-950 px-2 py-1.5 text-xs font-bold text-amber-200">보통은 3.3%(프리랜서) 또는 4대보험(직원) 중 하나만 뗍니다. 둘 다 체크하면 둘 다 뺀 금액으로 보여 줍니다.</p>
        ) : null}
        {data.deductInsurance ? (
          <details className="group rounded-lg border border-white/15 p-2">
            <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden">
              <span className="grid size-6 place-items-center rounded-full bg-amber-400 text-[10px] text-black transition-transform group-open:rotate-90">▶</span>
              4대보험 요율(2026년 근로자 부담 기준 · 눌러서 고치기)
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["pension", "국민연금 %"],
                  ["health", "건강보험 %"],
                  ["care", "장기요양(건강보험료의 %)"],
                  ["employment", "고용보험 %"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="grid gap-1 text-xs font-bold text-zinc-300">
                  {label}
                  <input
                    inputMode="decimal"
                    value={data.rates[key]}
                    onChange={(e) => set({ rates: { ...data.rates, [key]: Number(e.target.value) || 0 } })}
                    className="h-10 rounded-lg border border-white/20 bg-black px-2 text-base font-bold"
                  />
                </label>
              ))}
              <button type="button" onClick={() => set({ rates: DEFAULT_RATES })} className="min-h-10 rounded-lg border border-white/25 px-2 text-xs font-bold">
                기본값으로
              </button>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">실제 공제액은 회사 신고(보수월액) 기준이라 조금 다를 수 있습니다. 10원 미만은 버립니다.</p>
          </details>
        ) : null}
      </section>

      {/* 결과 */}
      <section aria-label="급여 결과" className="grid gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-950/30 p-3 sm:p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-black">결과</h2>
          <span className="text-sm text-zinc-300">
            근무 {result.workDays}일 · {hoursText(result.totalMinutes)}
          </span>
        </div>
        <dl className="grid gap-1 text-base">
          <Row label={data.mode === "daily" ? `세전 합계(일당 × ${result.workDays}일)` : `세전 합계(시급 × ${hoursText(result.totalMinutes)})`} value={won(result.gross)} strong />
          {data.deduct33 ? <Row label={`3.3% 공제 (소득세 ${won(result.tax.income)} · 지방세 ${won(result.tax.local)})`} value={`-${won(result.tax.total)}`} minus /> : null}
          {data.deductInsurance ? (
            <>
              <Row label="국민연금" value={`-${won(result.insurance.pension)}`} minus />
              <Row label="건강보험" value={`-${won(result.insurance.health)}`} minus />
              <Row label="장기요양보험" value={`-${won(result.insurance.care)}`} minus />
              <Row label="고용보험" value={`-${won(result.insurance.employment)}`} minus />
              <Row label="4대보험 합계" value={`-${won(result.insurance.total)}`} minus />
            </>
          ) : null}
          <div className="mt-1 flex items-baseline justify-between rounded-xl bg-black px-3 py-2">
            <dt className="text-lg font-black">실수령액</dt>
            <dd data-net className="text-3xl font-black text-emerald-300 tabular-nums">
              {won(result.net)}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(text).catch(() => undefined);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            className="min-h-10 rounded-lg bg-[#FEE500] px-4 text-sm font-black text-black"
          >
            {copied ? "복사됨 ✓" : "결과 복사"}
          </button>
          <button type="button" onClick={() => void downloadPayImage(text, data.title || "급여 계산")} className="min-h-10 rounded-lg bg-white px-4 text-sm font-black text-black">
            이미지 저장
          </button>
        </div>
        <p className="text-[11px] text-zinc-500">입력한 내용은 이 기기에만 저장되고 다른 사람이나 서버로 보내지 않습니다. 참고용 계산이며 실제 급여 명세와 다를 수 있습니다.</p>
      </section>
    </div>
  );
}

function Row({ label, value, strong, minus }: { label: string; value: string; strong?: boolean; minus?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-2 border-b border-white/10 px-1 py-1", strong && "font-black")}>
      <dt className={cn("text-sm", minus ? "text-rose-200" : "text-zinc-200")}>{label}</dt>
      <dd className={cn("tabular-nums", minus ? "text-rose-300" : "text-white", strong && "text-lg")}>{value}</dd>
    </div>
  );
}
