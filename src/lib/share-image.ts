/**
 * 계산 결과를 정사각형 이미지(1080×1080)로 그려 카톡 등으로 공유하거나 저장합니다(브라우저 전용).
 * 휴대폰은 공유 창(Web Share)으로, 안 되면 이미지 파일로 내려받습니다. 하단에 사이트 주소가 들어가 홍보도 됩니다.
 */
export type ShareLine = { label: string; value: string; strong?: boolean };

const SIZE = 1080;
const GOLD = "#e7c98a";

/** 결과 카드 그리기 → PNG Blob */
export async function drawResultImage({ title, subtitle, lines, url }: { title: string; subtitle?: string; lines: ShareLine[]; url: string }): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // 배경
  const bg = ctx.createLinearGradient(0, 0, 0, SIZE);
  bg.addColorStop(0, "#1d1412");
  bg.addColorStop(1, "#0b0807");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = "rgba(201,162,92,0.6)";
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, SIZE - 72, SIZE - 72);
  // 로고
  const logo = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/brand/poka-oni-mark.png";
  });
  if (logo) ctx.drawImage(logo, 80, 80, 120, 120);
  const font = (size: number, weight = 800) => `${weight} ${size}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.font = font(64, 900);
  ctx.fillText(title, 230, 150);
  if (subtitle) {
    ctx.fillStyle = "#d1c7b5";
    ctx.font = font(34, 600);
    ctx.fillText(subtitle, 230, 200);
  }
  // 줄
  // 줄이 적으면 크게, 위아래 가운데로(빈칸이 위로 몰리지 않게)
  const rowH = Math.min(150, Math.floor(620 / Math.max(lines.length, 1)));
  let y = 270 + (640 - rowH * lines.length) / 2 + rowH * 0.62;
  for (const line of lines) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(80, y - rowH * 0.62, SIZE - 160, rowH * 0.86);
    ctx.fillStyle = "#cfc6b8";
    ctx.font = font(Math.round(rowH * 0.36), 700);
    ctx.fillText(line.label, 110, y);
    ctx.fillStyle = line.strong ? GOLD : "#ffffff";
    // 값이 칸(이름 오른쪽)에 다 들어가게 글씨를 줄여 맞춤(잘리지 않게)
    const labelW = ctx.measureText(line.label).width;
    const room = SIZE - 220 - labelW - 40;
    let size = Math.round(rowH * (line.strong ? 0.46 : 0.4));
    ctx.font = font(size, 900);
    while (ctx.measureText(line.value).width > room && size > 20) {
      size -= 2;
      ctx.font = font(size, 900);
    }
    const w = ctx.measureText(line.value).width;
    ctx.fillText(line.value, SIZE - 110 - w, y);
    y += rowH;
  }
  // 아래: 사이트 주소(홍보)
  ctx.fillStyle = GOLD;
  ctx.font = font(36, 900);
  const foot = `POKA · ${url}`;
  ctx.fillText(foot, (SIZE - ctx.measureText(foot).width) / 2, SIZE - 90);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** 공유 창으로 보내기(휴대폰) · 안 되면 내려받기. 결과: "shared" | "downloaded" | "failed" */
export async function shareResultImage(opts: { title: string; subtitle?: string; lines: ShareLine[]; url: string; fileName: string }) {
  const blob = await drawResultImage(opts).catch(() => null);
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
