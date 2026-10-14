/**
 * 계산 결과 · 차트를 이미지로 그려 카톡 등으로 공유하거나 저장합니다(브라우저 전용).
 * 크기: 정사각형 1080×1080(카톡 · 단톡방) · 세로형 1080×1920(인스타 스토리).
 * 휴대폰은 공유 창(Web Share)으로, 안 되면 이미지 파일로 내려받습니다.
 * 아래에 사이트 주소 + QR(휴대폰 카메라로 찍으면 바로 그 도구)이 들어가 홍보도 됩니다.
 */
export type ShareLine = { label: string; value: string; strong?: boolean };
export type ShareFormat = "square" | "story";

const W = 1080;
const GOLD = "#e7c98a";
/** 아래 주소 · QR 칸 높이 */
const FOOT_H = 190;

const heightOf = (format: ShareFormat) => (format === "story" ? 1920 : 1080);
const font = (size: number, weight = 800) => `${weight} ${size}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 바탕 · 테두리 · 로고 · 제목 */
async function drawFrame(title: string, subtitle: string | undefined, format: ShareFormat) {
  const H = heightOf(format);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1d1412");
  bg.addColorStop(1, "#0b0807");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(201,162,92,0.6)";
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  // 세로형은 위를 넉넉하게
  const top = format === "story" ? 120 : 0;
  const logo = await loadImage("/brand/poka-oni-mark.png");
  if (logo) ctx.drawImage(logo, 80, 80 + top, 120, 120);
  ctx.fillStyle = GOLD;
  ctx.font = font(64, 900);
  ctx.fillText(title, 230, 150 + top);
  if (subtitle) {
    ctx.fillStyle = "#d1c7b5";
    let size = 34;
    ctx.font = font(size, 600);
    while (ctx.measureText(subtitle).width > W - 310 && size > 20) {
      size -= 2;
      ctx.font = font(size, 600);
    }
    ctx.fillText(subtitle, 230, 200 + top);
  }
  return { canvas, ctx, H, contentTop: 260 + top, contentBottom: H - FOOT_H - (format === "story" ? 120 : 10) };
}

/** 아래: 사이트 주소 + QR(그 도구 주소) */
async function drawFooter(ctx: CanvasRenderingContext2D, H: number, url: string, byline?: string | null) {
  const qrSize = 130;
  const qrX = W - 80 - qrSize;
  const qrY = H - 70 - qrSize;
  try {
    const QR = await import("qrcode");
    const dataUrl = await QR.toDataURL(`https://${url}`, { width: qrSize * 2, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
    const img = await loadImage(dataUrl);
    if (img) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
    }
  } catch {
    /* QR을 못 그려도 주소는 들어감 */
  }
  ctx.fillStyle = "#d1c7b5";
  ctx.font = font(28, 700);
  // 로그인한 회원이면 「○○님이 공유」
  ctx.fillText(byline ? `${byline}님이 공유 · 📱 찍으면 바로 계산` : "📱 카메라로 찍으면 바로 계산해 볼 수 있어요", 80, H - 150);
  ctx.fillStyle = GOLD;
  let size = 36;
  ctx.font = font(size, 900);
  const text = `POKA · ${url}`;
  while (ctx.measureText(text).width > qrX - 110 && size > 20) {
    size -= 2;
    ctx.font = font(size, 900);
  }
  ctx.fillText(text, 80, H - 95);
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** 결과 카드(이름 · 값 줄) → PNG */
export async function drawResultImage({
  title,
  subtitle,
  lines,
  url,
  format = "square",
  byline,
}: {
  title: string;
  subtitle?: string;
  lines: ShareLine[];
  url: string;
  format?: ShareFormat;
  /** 공유한 회원 닉네임(없으면 안 넣음) */
  byline?: string | null;
}): Promise<Blob | null> {
  const frame = await drawFrame(title, subtitle, format);
  if (!frame) return null;
  const { canvas, ctx, H, contentTop, contentBottom } = frame;
  // 줄이 적으면 크게, 제목과 아래 사이 가운데로
  const area = contentBottom - contentTop;
  const rowH = Math.min(150, Math.floor(area / Math.max(lines.length, 1)));
  let y = contentTop + (area - rowH * lines.length) / 2 + rowH * 0.62;
  for (const line of lines) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(80, y - rowH * 0.62, W - 160, rowH * 0.86);
    ctx.fillStyle = "#cfc6b8";
    ctx.font = font(Math.round(rowH * 0.36), 700);
    ctx.fillText(line.label, 110, y);
    // 값이 칸(이름 오른쪽)에 다 들어가게 글씨를 줄여 맞춤(잘리지 않게)
    const labelW = ctx.measureText(line.label).width;
    const room = W - 220 - labelW - 40;
    ctx.fillStyle = line.strong ? GOLD : "#ffffff";
    let size = Math.round(rowH * (line.strong ? 0.46 : 0.4));
    ctx.font = font(size, 900);
    while (ctx.measureText(line.value).width > room && size > 20) {
      size -= 2;
      ctx.font = font(size, 900);
    }
    ctx.fillText(line.value, W - 110 - ctx.measureText(line.value).width, y);
    y += rowH;
  }
  await drawFooter(ctx, H, url, byline);
  return toBlob(canvas);
}

/** 범위 차트(13×13 패 표, 한두 개) → PNG. names: 169개 패 이름(가로줄 순서). 세로형은 표를 위아래로 */
export async function drawRangeImage({
  title,
  subtitle,
  grids,
  names,
  url,
  format = "square",
  byline,
}: {
  title: string;
  subtitle?: string;
  grids: { label: string; set: ReadonlySet<number>; color: string }[];
  names: string[];
  url: string;
  format?: ShareFormat;
  /** 공유한 회원 닉네임(없으면 안 넣음) */
  byline?: string | null;
}): Promise<Blob | null> {
  const frame = await drawFrame(title, subtitle, format);
  if (!frame) return null;
  const { canvas, ctx, H, contentTop, contentBottom } = frame;
  const gap = 30;
  const labelH = 48;
  const stacked = format === "story" && grids.length > 1;
  const top = contentTop + labelH;
  const gridW = stacked
    ? Math.min(W - 160, (contentBottom - contentTop - grids.length * labelH - gap * (grids.length - 1)) / grids.length)
    : Math.min((W - 160 - gap * (grids.length - 1)) / grids.length, contentBottom - top);
  const cell = gridW / 13;
  grids.forEach((g, gi) => {
    const x0 = stacked ? (W - gridW) / 2 : 80 + gi * (gridW + gap) + (grids.length === 1 ? (W - 160 - gridW) / 2 : 0);
    const y0 = stacked ? top + gi * (gridW + gap + labelH) : top;
    ctx.fillStyle = "#ffffff";
    ctx.font = font(30, 900);
    ctx.fillText(g.label, x0, y0 - 18);
    names.forEach((name, k) => {
      const x = x0 + (k % 13) * cell;
      const y = y0 + Math.floor(k / 13) * cell;
      ctx.fillStyle = g.set.has(k) ? g.color : "rgba(255,255,255,0.07)";
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      ctx.fillStyle = g.set.has(k) ? "#ffffff" : "#7c7468";
      ctx.font = font(Math.max(9, Math.floor(cell * 0.3)), 800);
      const w = ctx.measureText(name).width;
      ctx.fillText(name, x + (cell - w) / 2, y + cell * 0.62);
    });
  });
  await drawFooter(ctx, H, url, byline);
  return toBlob(canvas);
}

/** 이미 그린 이미지를 공유 창으로 보내기(휴대폰) · 안 되면 내려받기 */
export async function shareBlob(blob: Blob | null, opts: { title: string; url: string; fileName: string }) {
  if (!blob) return "failed" as const;
  const file = new File([blob], `${opts.fileName}.png`, { type: "image/png" });
  try {
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: opts.title, text: `${opts.title} · ${opts.url}` });
      return "shared" as const;
    }
  } catch {
    /* 공유를 취소하면 내려받기로 */
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${opts.fileName}.png`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "downloaded" as const;
}

/** 결과 카드 그려서 공유 · 저장. 결과: "shared" | "downloaded" | "failed" */
export async function shareResultImage(opts: { title: string; subtitle?: string; lines: ShareLine[]; url: string; fileName: string; format?: ShareFormat; byline?: string | null }) {
  return shareBlob(await drawResultImage(opts).catch(() => null), opts);
}
