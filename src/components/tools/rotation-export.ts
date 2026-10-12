"use client";

import type { RotationDealerView } from "@/lib/rotation";
import { formatClock, type RotationPlan } from "@/lib/rotation-plan";

/**
 * 로테이션 공유(단톡방·캡처)는 "지금 교대" 한 번만 보여 줍니다.
 * 테이블마다 "T5 박딜러 → 김딜러"처럼 나가는 딜러 → 들어가는 딜러를 한 줄에 적어, 시간·테이블·사람을 헷갈리지 않게 합니다.
 */

const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

export type SwapRow = { label: number; from: string | null; to: string | null; closed: boolean };

export type SwapInfo = {
  at: number;
  prevAt: number | null;
  rows: SwapRow[];
  /** 이번 교대로 쉬러 가는 딜러 */
  toRest: string[];
  /** 계속 쉬는 딜러 */
  stillRest: string[];
};

/** 다음 교대(지금 칸 → 다음 칸) 정리. 다음 칸이 없으면 null */
export function swapInfo(
  plan: RotationPlan,
  labels: number[],
  current: number,
  next: number,
  closedFrom: (number | null)[],
): SwapInfo | null {
  if (next < 0 || !plan.slots[next]) return null;
  const before = current >= 0 ? plan.slots[current] : null;
  const after = plan.slots[next];
  const rows = labels.map((label, t) => ({
    label,
    from: before?.seats[t] ?? null,
    to: after.seats[t] ?? null,
    closed: closedFrom[t] != null && after.at >= (closedFrom[t] as number),
  }));
  const toRest = after.rest.filter((id) => !before?.rest.includes(id));
  const stillRest = after.rest.filter((id) => before?.rest.includes(id));
  return { at: after.at, prevAt: before?.at ?? null, rows, toRest, stillRest };
}

function rowText(row: SwapRow, name: (id: string | null) => string) {
  if (row.closed) return row.from ? `${name(row.from)} → 컨바인(종료)` : "컨바인(종료)";
  if (!row.from) return `→ ${name(row.to) || "비어 있음"}`;
  if (row.from === row.to) return `${name(row.to)} (유지)`;
  return `${name(row.from)} → ${name(row.to) || "비어 있음"}`;
}

/** 단톡방 텍스트 */
export function swapText(info: SwapInfo, name: (id: string | null) => string, buttons: Record<number, number | null | undefined>) {
  const lines = [`【 ${formatClock(info.at)} 교대 】`];
  for (const row of info.rows) {
    const btn = buttons[row.label] ? ` (BTN ${buttons[row.label]})` : "";
    lines.push(`T${row.label}${btn}  ${rowText(row, name)}`);
  }
  if (info.toRest.length) lines.push(`휴식 들어감: ${info.toRest.map(name).join(", ")}`);
  if (info.stillRest.length) lines.push(`계속 휴식: ${info.stillRest.map(name).join(", ")}`);
  return lines.join("\n");
}

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

/** 시간별(교대표) 이미지: 큰 교대 시간 + "T5 박딜러 → 김딜러" 줄 */
export function downloadSwapImage(info: SwapInfo, name: (id: string | null) => string, buttons: Record<number, number | null | undefined>) {
  const width = 640;
  const lineH = 46;
  const restLines = (info.toRest.length ? 1 : 0) + (info.stillRest.length ? 1 : 0);
  const height = 130 + info.rows.length * lineH + restLines * 36 + 30;
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
  ctx.fillRect(0, 0, width, 96);
  ctx.fillStyle = "#000";
  ctx.font = `900 54px ${FONT}`;
  ctx.fillText(`${formatClock(info.at)} 교대`, 24, 68);
  if (info.prevAt != null) {
    ctx.font = `700 16px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(`이전 ${formatClock(info.prevAt)} → ${formatClock(info.at)}`, width - 24, 62);
    ctx.textAlign = "left";
  }
  info.rows.forEach((row, i) => {
    const y = 130 + i * lineH;
    ctx.fillStyle = i % 2 ? "#141417" : "#1c1c20";
    ctx.fillRect(12, y - 32, width - 24, lineH - 4);
    ctx.fillStyle = row.closed ? "#71717a" : "#34d399";
    ctx.font = `900 28px ${FONT}`;
    ctx.fillText(`T${row.label}`, 24, y);
    if (buttons[row.label]) {
      ctx.fillStyle = "#a1a1aa";
      ctx.font = `700 13px ${FONT}`;
      ctx.fillText(`BTN ${buttons[row.label]}`, 24, y + 10);
    }
    ctx.font = `800 24px ${FONT}`;
    if (row.closed) {
      ctx.fillStyle = "#71717a";
      ctx.fillText("컨바인(종료)", 130, y);
    } else if (row.from && row.from === row.to) {
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${name(row.to)}  (유지)`, 130, y);
    } else {
      ctx.fillStyle = "#a1a1aa";
      const fromText = row.from ? name(row.from) : "";
      ctx.fillText(fromText, 130, y);
      const w = ctx.measureText(fromText).width;
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(" → ", 130 + w, y);
      const aw = ctx.measureText(" → ").width;
      ctx.fillStyle = row.to ? "#ffffff" : "#fb7185";
      ctx.fillText(row.to ? name(row.to) : "비어 있음", 130 + w + aw, y);
    }
  });
  let y = 130 + info.rows.length * lineH + 10;
  ctx.font = `800 20px ${FONT}`;
  if (info.toRest.length) {
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`휴식 들어감  ${info.toRest.map(name).join(", ")}`, 24, y);
    y += 36;
  }
  if (info.stillRest.length) {
    ctx.fillStyle = "#a1a1aa";
    ctx.fillText(`계속 휴식  ${info.stillRest.map(name).join(", ")}`, 24, y);
  }
  save(canvas, `교대_${formatClock(info.at).replace(":", "")}.png`);
}

/** 딜러별 이미지: 딜러마다 "지금 → 교대 후" */
export function downloadDealerSwapImage(info: SwapInfo, plan: RotationPlan, current: number, next: number, labels: number[], dealers: RotationDealerView[]) {
  const before = current >= 0 ? plan.slots[current] : null;
  const after = plan.slots[next];
  const where = (slot: typeof after | null, id: string) => {
    if (!slot) return "—";
    const t = slot.seats.indexOf(id);
    if (t >= 0) return `T${labels[t]}`;
    return slot.rest.includes(id) ? "휴식" : "—";
  };
  const list = dealers.filter((d) => where(before, d.id) !== "—" || where(after, d.id) !== "—");
  const width = 600;
  const lineH = 42;
  const height = 120 + list.length * lineH + 20;
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
  ctx.font = `900 40px ${FONT}`;
  ctx.fillText(`${formatClock(info.at)} 교대 · 딜러별`, 24, 56);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText(`${info.prevAt != null ? `지금(${formatClock(info.prevAt)})` : "지금"} → ${formatClock(info.at)}`, 24, 86);
  list.forEach((dealer, i) => {
    const y = 128 + i * lineH;
    ctx.fillStyle = i % 2 ? "#141417" : "#1c1c20";
    ctx.fillRect(12, y - 30, width - 24, lineH - 4);
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 22px ${FONT}`;
    ctx.fillText(dealer.name.slice(0, 8), 24, y);
    const now = where(before, dealer.id);
    const then = where(after, dealer.id);
    ctx.fillStyle = "#a1a1aa";
    ctx.font = `800 22px ${FONT}`;
    ctx.fillText(now, 230, y);
    ctx.fillStyle = "#fbbf24";
    ctx.fillText("→", 320, y);
    ctx.fillStyle = then === "휴식" ? "#fbbf24" : now === then ? "#ffffff" : "#34d399";
    ctx.fillText(`${then}${now === then ? " (유지)" : ""}`, 360, y);
  });
  save(canvas, `교대_딜러별_${formatClock(info.at).replace(":", "")}.png`);
}
