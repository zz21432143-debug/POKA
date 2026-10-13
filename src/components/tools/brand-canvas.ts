"use client";

/**
 * 딜러 툴 이미지·인쇄에 넣는 POKA 표시(로고 + 맨 아래 출처 띠). 로테이션·싯드로우·급여 계산기가 같이 씁니다.
 */

export const BRAND_FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
/** POKA 로고(홀덤 커뮤니티) */
export const LOGO_SRC = "/brand/poka-holdem-logo.jpg";
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

/** 로고(검은 둥근 칸 안) */
export function drawLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, x: number, y: number, size: number) {
  if (!logo) return;
  ctx.save();
  ctx.fillStyle = "#0b0b0d";
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 12);
  ctx.fill();
  ctx.clip();
  ctx.drawImage(logo, x, y, size, size);
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
    <img src="${window.location.origin}${LOGO_SRC}" alt="POKA" style="width:64px;height:64px;border-radius:10px">
    <div><h1 style="margin:0">${esc(title)}</h1>${subtitle ? `<p style="margin:2px 0 0;color:#444;font-size:13px">${esc(subtitle)}</p>` : ""}</div>
  </header>`;
}
export const PRINT_FOOTER = `<footer style="margin-top:12px;text-align:center;font-size:12px;color:#555">ⓒ ${CREDIT}</footer>`;
/** 로고 이미지가 뜬 뒤 인쇄 */
export const PRINT_ON_LOAD = `<script>window.onload=function(){window.focus();window.print();}</script>`;
