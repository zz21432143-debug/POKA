"use client";

/**
 * 딜러 툴 이미지·인쇄에 넣는 POKA 표시(로고 + 맨 아래 출처 띠). 로테이션·싯드로우·급여 계산기가 같이 씁니다.
 */

export const BRAND_FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
/** POKA 마크(오니 캐릭터, 둥근 모서리 · 투명 배경) */
export const LOGO_SRC = "/brand/poka-oni-mark.png";
/** 맨 아래·텍스트 끝 출처 */
export const CREDIT = "POKA 홀덤 커뮤니티 · pokerwiki.co.kr";
export const FOOTER_H = 46;

let logoPromise: Promise<HTMLImageElement | null> | null = null;
export function loadLogo() {
  logoPromise ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = LOGO_SRC;
  });
  return logoPromise;
}

/** 마크(둥근 모서리 그대로). 왼쪽 위에 둡니다 — 오른쪽만 잘라 올려도 아래 무늬로 POKA가 남습니다. */
export function drawLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, x: number, y: number, size: number) {
  if (!logo) return;
  const h = Math.round((size * logo.naturalHeight) / logo.naturalWidth);
  ctx.drawImage(logo, x, y, size, h);
}

/**
 * 잘라서 올려도 POKA가 보이게: 내용 위에 옅은 마크 무늬를 촘촘히 깝니다(글씨는 그대로 읽힘).
 * from~to 세로 구간에만(머리·출처 띠 제외).
 */
export function drawWatermark(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, width: number, from: number, to: number) {
  if (!logo) return;
  const size = 56;
  const h = Math.round((size * logo.naturalHeight) / logo.naturalWidth);
  const stepX = 170;
  const stepY = 130;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, from, width, Math.max(0, to - from));
  ctx.clip();
  ctx.globalAlpha = 0.09;
  for (let row = 0, y = from + 20; y < to; row += 1, y += stepY) {
    for (let x = (row % 2) * (stepX / 2) + 20; x < width; x += stepX) ctx.drawImage(logo, x, y, size, h);
  }
  ctx.restore();
}

/** 맨 아래 출처 띠 */
export function drawCredit(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#7f1d1d";
  ctx.fillRect(0, height - FOOTER_H, width, FOOTER_H);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 16px ${BRAND_FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`ⓒ ${CREDIT}`, width / 2, height - FOOTER_H / 2 + 6);
  ctx.textAlign = "left";
}

/** 캔버스를 PNG로 내려받기 */
export function saveCanvas(canvas: HTMLCanvasElement, filename: string) {
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

/** 인쇄 창 위쪽 머리(로고 + 제목)와 아래 출처. 로고가 뜬 뒤 인쇄합니다. */
export function printHeader(title: string, subtitle = "") {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<header style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
    <img src="${window.location.origin}${LOGO_SRC}" alt="POKA" style="width:64px;height:auto">
    <div><h1 style="margin:0">${esc(title)}</h1>${subtitle ? `<p style="margin:2px 0 0;color:#444;font-size:13px">${esc(subtitle)}</p>` : ""}</div>
  </header>`;
}
export const PRINT_FOOTER = `<footer style="margin-top:12px;text-align:center;font-size:12px;color:#555">ⓒ ${CREDIT}</footer>`;
/** 인쇄·PDF: 페이지마다 옅은 마크 무늬(잘라 써도 POKA가 보이게) */
export function printWatermark() {
  return `<div style="position:fixed;inset:0;z-index:9;pointer-events:none;opacity:.08;background:url(${window.location.origin}/brand/poka-watermark-tile.png) repeat;background-size:340px 260px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>`;
}
/** 로고 이미지가 뜬 뒤 인쇄 */
export const PRINT_ON_LOAD = `<script>window.onload=function(){window.focus();window.print();}</script>`;
