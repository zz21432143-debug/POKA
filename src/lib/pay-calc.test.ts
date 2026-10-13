import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcPay, payText, shiftMinutes } from "./pay-calc";

describe("dealer pay calculator", () => {
  it("counts worked minutes with break and overnight shifts", () => {
    assert.deepEqual(shiftMinutes({ date: "2026-10-13", start: "10:00", end: "18:00", breakMinutes: 60 }), { minutes: 420, nightMinutes: 0, valid: true });
    // 20:00 → 04:00, 휴게 30분: 7시간 30분, 야간 22~04시 = 6시간
    assert.deepEqual(shiftMinutes({ date: "2026-10-13", start: "20:00", end: "04:00", breakMinutes: 30 }), { minutes: 450, nightMinutes: 360, valid: true });
    // 새벽 02:00 → 08:00: 야간 02~06시 = 4시간
    assert.equal(shiftMinutes({ date: "2026-10-13", start: "02:00", end: "08:00", breakMinutes: 0 }).nightMinutes, 240);
    assert.equal(shiftMinutes({ date: "2026-10-13", start: "25:00", end: "08:00", breakMinutes: 0 }).valid, false);
  });

  it("hourly pay with night bonus and 3.3% deduction", () => {
    const result = calcPay({
      shifts: [
        { date: "2026-10-13", start: "18:00", end: "02:00", breakMinutes: 0 },
        { date: "2026-10-14", start: "18:00", end: "23:00", breakMinutes: 0 },
      ],
      mode: "hourly",
      amount: 15000,
      night: true,
      deduct33: true,
      deductInsurance: false,
    });
    // 8시간 + 5시간 = 13시간 → 195,000원, 야간 4시간 + 1시간 = 5시간 × 7,500 = 37,500원
    assert.equal(result.totalMinutes, 780);
    assert.equal(result.basePay, 195000);
    assert.equal(result.nightPay, 37500);
    assert.equal(result.gross, 232500);
    // 소득세 3% = 6,975 → 6,970 · 지방소득세 697 → 690
    assert.deepEqual(result.tax, { income: 6970, local: 690, total: 7660 });
    assert.equal(result.net, 224840);
  });

  it("daily pay with 4 insurances", () => {
    const result = calcPay({
      shifts: Array.from({ length: 10 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, "0")}`, start: "12:00", end: "22:00", breakMinutes: 60 })),
      mode: "daily",
      amount: 150000,
      night: true,
      deduct33: false,
      deductInsurance: true,
    });
    assert.equal(result.gross, 1500000);
    assert.equal(result.nightPay, 0, "일당제는 야간 가산 없음");
    // 국민연금 4.75% 71,250 · 건강 3.595% 53,925 → 53,920 · 장기요양 53,920 × 13.14% = 7,085 → 7,080 · 고용 0.9% 13,500
    assert.deepEqual(result.insurance, { pension: 71250, health: 53920, care: 7080, employment: 13500, total: 145750 });
    assert.equal(result.net, 1354250);
    assert.match(payText({ shifts: [], mode: "daily", amount: 150000, night: false, deduct33: false, deductInsurance: true }, result), /실수령 1,354,250원/);
  });
});
