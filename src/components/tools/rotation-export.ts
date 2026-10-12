"use client";

import type { RotationDealerView } from "@/lib/rotation";
import { dealerSchedule, formatClock, type RotationPlan } from "@/lib/rotation-plan";

/**
 * 로테이션 시간표 내보내기(단톡방 공유용). 시간과 테이블 번호가 늘 붙어 있게 그립니다.
 * 표처럼 시각은 왼쪽 끝, 테이블은 위쪽 끝에 떨어져 있으면 딜러가 줄을 헷갈려 다른 테이블로 갈 수 있어서입니다.
 */

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

function save(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function stamp() {
  const d = new Date();
  return `${d.getMonth() + 1}-${d.getDate()}`;
}

/** 단톡방 텍스트: 칸마다 "■ 23:00 교대" 아래에 "23:00 T5 김딜러" 줄 */
export function timeSheetText(
  plan: RotationPlan,
  labels: number[],
  name: (id: string | null) => string,
  indexes: number[],
  slotLabel: (index: number) => string | null,
) {
  const lines = ["【 딜러 로테이션 】", ""];
  for (const index of indexes) {
    const slot = plan.slots[index];
    const time = formatClock(slot.at);
    lines.push(`■ ${time} ${slotLabel(index) ?? "교대"}`);
    slot.seats.forEach((id, t) => {
      lines.push(`  ${time} T${labels[t]} ${id ? name(id) : "(비어 있음)"}`);
    });
    if (slot.rest.length) lines.push(`  ${time} 휴식 ${slot.rest.map(name).join(", ")}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

/** 시간별 교대표 이미지: 칸마다 큰 시각 아래 "T5 김딜러" 목록 */
export function downloadTimeImage(
  plan: RotationPlan,
  labels: number[],
  name: (id: string | null) => string,
  indexes: number[],
  slotLabel: (index: number) => string | null,
) {
  const cols = Math.min(3, indexes.length);
  const cardW = 340;
  const lineH = 30;
  const pad = 18;
  const cardH = 70 + labels.length * lineH + 44;
  const rows = Math.ceil(indexes.length / cols);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = (pad + cols * (cardW + pad)) * scale;
  canvas.height = (80 + rows * (cardH + pad)) * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f5d76e";
  ctx.font = `900 28px ${FONT}`;
  ctx.fillText("딜러 로테이션 · 시간별", pad, 46);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `14px ${FONT}`;
  ctx.fillText(`${plan.interval}분 간격 · 테이블 ${labels.map((l) => `T${l}`).join(" ")}`, pad, 68);

  indexes.forEach((index, i) => {
    const slot = plan.slots[index];
    const time = formatClock(slot.at);
    const x = pad + (i % cols) * (cardW + pad);
    const y = 80 + Math.floor(i / cols) * (cardH + pad);
    ctx.fillStyle = "#18181b";
    ctx.fillRect(x, y, cardW, cardH);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(x, y, cardW, 54);
    ctx.fillStyle = "#000";
    ctx.font = `900 34px ${FONT}`;
    ctx.fillText(time, x + 14, y + 40);
    const tag = slotLabel(index);
    if (tag) {
      ctx.font = `900 18px ${FONT}`;
      ctx.fillText(tag, x + 130, y + 38);
    }
    slot.seats.forEach((id, t) => {
      const ly = y + 54 + 26 + t * lineH;
      ctx.fillStyle = "#34d399";
      ctx.font = `900 20px ${FONT}`;
      ctx.fillText(`T${labels[t]}`, x + 14, ly);
      ctx.fillStyle = id ? "#ffffff" : "#fb7185";
      ctx.font = `700 20px ${FONT}`;
      ctx.fillText(id ? name(id) : "비어 있음", x + 84, ly);
      ctx.fillStyle = "#71717a";
      ctx.font = `13px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText(time, x + cardW - 12, ly);
      ctx.textAlign = "left";
    });
    ctx.fillStyle = "#fbbf24";
    ctx.font = `700 15px ${FONT}`;
    const restText = `휴식 ${slot.rest.map(name).join(", ") || "—"}`;
    ctx.fillText(restText.length > 28 ? `${restText.slice(0, 27)}…` : restText, x + 14, y + cardH - 16);
  });
  save(canvas, `로테이션_시간별_${stamp()}.png`);
}

/** 딜러별 이미지: 딜러마다 "23:00 T5 · 23:20 휴식 …" 칩(시각과 테이블이 한 칩에) */
export function downloadDealerImage(
  plan: RotationPlan,
  labels: number[],
  dealers: RotationDealerView[],
  indexes: number[],
  slotLabel: (index: number) => string | null,
) {
  const chipW = 118;
  const chipH = 34;
  const gap = 6;
  const nameW = 120;
  const pad = 18;
  const perRow = Math.min(8, Math.max(1, indexes.length));
  const width = pad * 2 + nameW + perRow * (chipW + gap);
  const lineCount = (n: number) => Math.max(1, Math.ceil(n / perRow));
  const rowH = (n: number) => lineCount(n) * (chipH + gap) + 10;
  const height = 90 + dealers.reduce((sum) => sum + rowH(indexes.length), 0) + pad;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#f5d76e";
  ctx.font = `900 28px ${FONT}`;
  ctx.fillText("딜러 로테이션 · 딜러별", pad, 46);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `14px ${FONT}`;
  ctx.fillText(`${plan.interval}분 간격 · 초록 = 테이블, 노랑 = 휴식`, pad, 68);

  let y = 86;
  for (const dealer of dealers) {
    const schedule = dealerSchedule(plan, dealer.id).filter((_, index) => indexes.includes(index));
    ctx.fillStyle = "#18181b";
    ctx.fillRect(pad - 6, y - 4, width - pad * 2 + 12, rowH(schedule.length) - 4);
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 18px ${FONT}`;
    ctx.fillText(dealer.name.slice(0, 7), pad, y + 24);
    schedule.forEach((row, i) => {
      const cx = pad + nameW + (i % perRow) * (chipW + gap);
      const cy = y + Math.floor(i / perRow) * (chipH + gap);
      ctx.fillStyle = row.table == null ? "#27272a" : row.table === 0 ? "#fbbf24" : "#059669";
      ctx.fillRect(cx, cy, chipW, chipH);
      ctx.fillStyle = row.table === 0 ? "#000000" : "#ffffff";
      ctx.font = `900 16px ${FONT}`;
      const idx = plan.slots.findIndex((s) => s.at === row.at);
      const tag = slotLabel(idx);
      const where = row.table == null ? "—" : row.table === 0 ? "휴식" : `T${labels[row.table - 1]}`;
      ctx.fillText(`${formatClock(row.at)} ${where}${tag ? "·" + tag : ""}`, cx + 8, cy + 23);
    });
    y += rowH(schedule.length);
  }
  save(canvas, `로테이션_딜러별_${stamp()}.png`);
}
