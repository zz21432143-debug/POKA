"use client";

import { tableTag, type RotationDealerView } from "@/lib/rotation";
import { formatClock, type RotationPlan } from "@/lib/rotation-plan";
import { BRAND_FONT, CREDIT, FOOTER_H, drawCredit, drawLogo, drawWatermark, loadLogo, saveCanvas } from "@/components/tools/brand-canvas";

/**
 * 로테이션 공유(단톡방·캡처)는 "지금 교대" 한 번만 보여 줍니다.
 * 테이블마다 "T5 박딜러 → 김딜러"처럼 나가는 딜러 → 들어가는 딜러를 한 줄에 적어, 시간·테이블·사람을 헷갈리지 않게 합니다.
 */

const FONT = BRAND_FONT;

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
  /** 추가 오픈 시각: 아직 스탠바이(이번 교대 칸에도 안 열림)인 테이블은 빼고 보여 줌 */
  openFrom: (number | null)[] = [],
): SwapInfo | null {
  if (next < 0 || !plan.slots[next]) return null;
  const before = current >= 0 ? plan.slots[current] : null;
  const after = plan.slots[next];
  const rows = labels
    .map((label, t) => ({
      label,
      from: before?.seats[t] ?? null,
      to: after.seats[t] ?? null,
      closed: closedFrom[t] != null && after.at >= (closedFrom[t] as number),
    }))
    // 이미 컨바인된 테이블(지금도 비어 있음)은 빼고, 이번 교대에 닫히는 테이블만 남깁니다.
    .filter((row) => !(row.closed && !row.from))
    // 아직 오픈 전(스탠바이)인 빈 테이블도 뺌
    .filter((row) => {
      const o = openFrom[labels.indexOf(row.label)];
      return row.from || row.to || o == null || o < after.at + plan.interval;
    });
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
export function swapText(info: SwapInfo, name: (id: string | null) => string, button: number | null, title = "") {
  const lines = [`【 ${title ? `${title} · ` : ""}${formatClock(info.at)} 교대 】${button ? ` 버튼 ${button}번` : ""}`];
  for (const row of info.rows) lines.push(`${tableTag(row.label)}  ${rowText(row, name)}`);
  if (info.toRest.length) lines.push(`휴식 들어감: ${info.toRest.map(name).join(", ")}`);
  if (info.stillRest.length) lines.push(`계속 휴식: ${info.stillRest.map(name).join(", ")}`);
  lines.push(`- ${CREDIT}`);
  return lines.join("\n");
}

const save = saveCanvas;

/** 긴 글을 폭에 맞게 여러 줄로 나눕니다(이름 사이 ", " 기준) */
function wrapNames(ctx: CanvasRenderingContext2D, label: string, names: string[], maxWidth: number) {
  const lines: string[] = [];
  let line = label;
  for (const [index, item] of names.entries()) {
    const piece = (index ? ", " : "") + item;
    if (ctx.measureText(line + piece).width > maxWidth && line !== label) {
      lines.push(line);
      line = "   " + item;
    } else {
      line += piece;
    }
  }
  lines.push(line);
  return lines;
}

/** 줄 수에 맞춰 단(열) 수 정하기: 너무 길면 2~3단으로 */
function columnsFor(count: number, two: number, three: number) {
  return count > three ? 3 : count > two ? 2 : 1;
}

/** 시간별(교대표) 이미지: 큰 교대 시간 + "T5 박딜러 → 김딜러" 줄. 테이블이 많으면 2~3단 */
export async function downloadSwapImage(info: SwapInfo, name: (id: string | null) => string, button: number | null, title = "") {
  const logo = await loadLogo();
  const cols = columnsFor(info.rows.length, 14, 40);
  const colW = 640;
  const width = colW * cols;
  const lineH = 46;
  const perCol = Math.ceil(info.rows.length / cols);
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return;
  measure.font = `800 20px ${FONT}`;
  const restLines = [
    ...(info.toRest.length ? wrapNames(measure, "휴식 들어감  ", info.toRest.map(name), width - 48).map((text) => ({ text, color: "#fbbf24" })) : []),
    ...(info.stillRest.length ? wrapNames(measure, "계속 휴식  ", info.stillRest.map(name), width - 48).map((text) => ({ text, color: "#a1a1aa" })) : []),
  ];
  const height = 130 + perCol * lineH + restLines.length * 32 + 30 + FOOTER_H;
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
  drawLogo(ctx, logo, 12, 7, 80);
  ctx.fillText(`${formatClock(info.at)} 교대`, 104, 68);
  const sub = [info.prevAt != null ? `이전 ${formatClock(info.prevAt)} → ${formatClock(info.at)}` : "", button ? `버튼 ${button}번` : ""].filter(Boolean).join(" · ");
  ctx.textAlign = "right";
  if (title) {
    // 게임 이름(예: POKA DAY-1)
    ctx.font = `900 24px ${FONT}`;
    ctx.fillText(title, width - 24, 36);
  }
  if (sub) {
    ctx.font = `800 16px ${FONT}`;
    ctx.fillText(sub, width - 24, 66);
  }
  ctx.textAlign = "left";
  info.rows.forEach((row, index) => {
    const col = Math.floor(index / perCol);
    const i = index % perCol;
    const x = col * colW;
    const y = 130 + i * lineH;
    ctx.fillStyle = i % 2 ? "#141417" : "#1c1c20";
    ctx.fillRect(x + 12, y - 32, colW - 24, lineH - 4);
    ctx.fillStyle = row.closed ? "#fb7185" : "#34d399";
    ctx.font = `900 28px ${FONT}`;
    ctx.fillText(tableTag(row.label), x + 24, y);
    ctx.font = `800 24px ${FONT}`;
    if (row.closed) {
      ctx.fillStyle = "#a1a1aa";
      const fromText = row.from ? `${name(row.from)} → ` : "";
      ctx.fillText(fromText, x + 130, y);
      ctx.fillStyle = "#fb7185";
      ctx.fillText("컨바인(종료)", x + 130 + ctx.measureText(fromText).width, y);
    } else if (row.from && row.from === row.to) {
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${name(row.to)}  (유지)`, x + 130, y);
    } else {
      ctx.fillStyle = "#a1a1aa";
      const fromText = row.from ? name(row.from) : "";
      ctx.fillText(fromText, x + 130, y);
      const w = ctx.measureText(fromText).width;
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(" → ", x + 130 + w, y);
      const aw = ctx.measureText(" → ").width;
      ctx.fillStyle = row.to ? "#ffffff" : "#fb7185";
      ctx.fillText(row.to ? name(row.to) : "비어 있음", x + 130 + w + aw, y);
    }
  });
  let y = 130 + perCol * lineH + 6;
  ctx.font = `800 20px ${FONT}`;
  for (const line of restLines) {
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, 24, y);
    y += 32;
  }
  drawWatermark(ctx, logo, width, 96, height - FOOTER_H);
  drawCredit(ctx, width, height);
  save(canvas, `${title ? `${title.replace(/[\\/:*?"<>|\s]+/g, "_")}_` : ""}교대_${formatClock(info.at).replace(":", "")}.png`);
}

/** 딜러별 이미지: 딜러마다 "지금 → 교대 후". 딜러가 많으면 2~3단 */
export async function downloadDealerSwapImage(
  info: SwapInfo,
  plan: RotationPlan,
  current: number,
  next: number,
  labels: number[],
  dealers: RotationDealerView[],
  title = "",
) {
  const logo = await loadLogo();
  const before = current >= 0 ? plan.slots[current] : null;
  const after = plan.slots[next];
  const where = (slot: typeof after | null, id: string) => {
    if (!slot) return "—";
    const t = slot.seats.indexOf(id);
    if (t >= 0) return tableTag(labels[t]);
    return slot.rest.includes(id) ? "휴식" : "—";
  };
  const list = dealers.filter((d) => where(before, d.id) !== "—" || where(after, d.id) !== "—");
  const cols = columnsFor(list.length, 20, 60);
  const colW = 600;
  const width = colW * cols;
  const lineH = 42;
  const perCol = Math.max(1, Math.ceil(list.length / cols));
  const height = 120 + perCol * lineH + 20 + FOOTER_H;
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
  drawLogo(ctx, logo, 14, 12, 66);
  ctx.fillText(`${formatClock(info.at)} 교대 · 딜러별`, 94, 56);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText(`${title ? `${title} · ` : ""}${info.prevAt != null ? `지금(${formatClock(info.prevAt)})` : "지금"} → ${formatClock(info.at)}`, 94, 86);
  list.forEach((dealer, index) => {
    const col = Math.floor(index / perCol);
    const i = index % perCol;
    const x = col * colW;
    const y = 128 + i * lineH;
    ctx.fillStyle = i % 2 ? "#141417" : "#1c1c20";
    ctx.fillRect(x + 12, y - 30, colW - 24, lineH - 4);
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 22px ${FONT}`;
    ctx.fillText(dealer.name.slice(0, 8), x + 24, y);
    const now = where(before, dealer.id);
    const then = where(after, dealer.id);
    ctx.fillStyle = "#a1a1aa";
    ctx.font = `800 22px ${FONT}`;
    ctx.fillText(now, x + 230, y);
    ctx.fillStyle = "#fbbf24";
    ctx.fillText("→", x + 320, y);
    ctx.fillStyle = then === "휴식" ? "#fbbf24" : now === then ? "#ffffff" : "#34d399";
    ctx.fillText(`${then}${now === then ? " (유지)" : ""}`, x + 360, y);
  });
  drawWatermark(ctx, logo, width, 96, height - FOOTER_H);
  drawCredit(ctx, width, height);
  save(canvas, `${title ? `${title.replace(/[\\/:*?"<>|\s]+/g, "_")}_` : ""}교대_딜러별_${formatClock(info.at).replace(":", "")}.png`);
}
