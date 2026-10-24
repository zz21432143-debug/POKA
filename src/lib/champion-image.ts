/**
 * 파이널 테이블 우승 이미지(카톡방 공유용 · 1080×1080). 상금은 넣지 않음.
 * 브라우저 캔버스로 그려서 바로 공유 · 저장(서버 비용 없음).
 */
const SIZE = 1080;
const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, start: number, maxWidth: number) {
  let size = start;
  do {
    ctx.font = `${weight} ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  } while (size > 24);
  return size;
}

function crown(ctx: CanvasRenderingContext2D, cx: number, top: number, w: number) {
  const s = w / 64;
  const x = (v: number) => cx - w / 2 + v * s;
  const y = (v: number) => top + v * s;
  const gold = ctx.createLinearGradient(0, y(0), 0, y(46));
  gold.addColorStop(0, "#fff3b0");
  gold.addColorStop(0.5, "#f5c542");
  gold.addColorStop(1, "#b7791f");
  ctx.save();
  ctx.shadowColor = "rgba(252,211,77,.7)";
  ctx.shadowBlur = 40;
  ctx.fillStyle = gold;
  ctx.strokeStyle = "#7a4b0c";
  ctx.lineWidth = 1.5 * s;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x(4), y(16));
  ctx.lineTo(x(18), y(28));
  ctx.lineTo(x(32), y(6));
  ctx.lineTo(x(46), y(28));
  ctx.lineTo(x(60), y(16));
  ctx.lineTo(x(54), y(40));
  ctx.lineTo(x(10), y(40));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x(10), y(40), 44 * s, 6 * s, 2 * s);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  for (const [cxv, cyv, r, c] of [
    [32, 6, 3.2, "#ef4444"],
    [4, 16, 2.6, "#60a5fa"],
    [60, 16, 2.6, "#60a5fa"],
    [32, 32, 3, "#ef4444"],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x(cxv), y(cyv), r * s, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.strokeStyle = "#7a4b0c";
    ctx.lineWidth = s;
    ctx.stroke();
  }
}

export async function drawChampionImage(opts: { champion: string; event: string; finalists: string[]; date: string }) {
  try {
    await document.fonts?.ready;
  } catch {
    /* 기본 글꼴로 */
  }
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // 바탕 · 금빛 줄기
  const bg = ctx.createRadialGradient(SIZE / 2, SIZE * 0.42, 40, SIZE / 2, SIZE * 0.42, SIZE * 0.75);
  bg.addColorStop(0, "#3a2208");
  bg.addColorStop(1, "#050303");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.translate(SIZE / 2, SIZE * 0.42);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-40, -SIZE);
    ctx.lineTo(40, -SIZE);
    ctx.closePath();
    ctx.fillStyle = "rgba(226,189,114,0.07)";
    ctx.fill();
  }
  ctx.restore();
  // 꽃가루
  const colors = ["#f5c542", "#ef4444", "#60a5fa", "#fff3b0", "#34d399"];
  for (let i = 0; i < 70; i++) {
    const px = (i * 233) % SIZE;
    const py = (i * 157) % SIZE;
    // 글씨 자리(가운데)는 비움
    if (px > 150 && px < SIZE - 150 && py > 130 && py < SIZE - 40) continue;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(i);
    ctx.fillStyle = colors[i % 5];
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-7, -12, 14, 24);
    ctx.restore();
  }
  // 테두리
  ctx.strokeStyle = "rgba(226,189,114,0.7)";
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, SIZE - 56, SIZE - 56);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  crown(ctx, SIZE / 2, 150, 260);
  ctx.fillStyle = "#f5d76e";
  ctx.font = `900 64px ${FONT}`;
  ctx.fillText("C H A M P I O N", SIZE / 2, 470);
  // 우승자 이름(빛나게)
  const nameSize = fit(ctx, opts.champion, 900, 190, SIZE - 160);
  ctx.save();
  ctx.shadowColor = "rgba(252,211,77,.9)";
  ctx.shadowBlur = 50;
  ctx.fillStyle = "#fde68a";
  ctx.fillText(opts.champion, SIZE / 2, 470 + 40 + nameSize);
  ctx.restore();
  let yPos = 470 + 40 + nameSize + 90;
  // 대회 이름 · 날짜
  const eventSize = fit(ctx, opts.event, 900, 56, SIZE - 160);
  ctx.fillStyle = "#f6efe2";
  ctx.fillText(opts.event, SIZE / 2, yPos);
  yPos += eventSize * 0.4 + 46;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillStyle = "#c9b99a";
  ctx.fillText(opts.date, SIZE / 2, yPos);
  // 파이널 테이블 이름
  if (opts.finalists.length) {
    const line = `FINAL TABLE · ${opts.finalists.join(" · ")}`;
    fit(ctx, line, 700, 30, SIZE - 140);
    ctx.fillStyle = "#a89c88";
    ctx.fillText(line, SIZE / 2, Math.min(SIZE - 120, yPos + 70));
  }
  // 아래 POKA
  ctx.font = `900 30px ${FONT}`;
  ctx.fillStyle = "#e2bd72";
  ctx.fillText("POKA · pokerwiki.co.kr", SIZE / 2, SIZE - 62);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}
