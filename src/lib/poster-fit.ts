/**
 * 홍보물 사진 자동 맞춤(브라우저 전용). 공식 홍보 포스터와 사이드바·배너 직판 소재에 씁니다.
 * 메인 B1–B6·홍보 갤러리 칸은 세로 5:7이라 다른 비율 사진은 잘립니다.
 * 1000×1400 캔버스에 사진 전체가 보이게 가운데 놓고, 남는 여백은 같은 사진을 흐리게 깔아 채웁니다.
 * 비율이 거의 같으면(±3%) 여백 없이 꽉 채웁니다.
 */
export const POSTER_W = 1000;
export const POSTER_H = 1400;

/** 이 비율 차이 안이면 여백 없이 채웁니다(살짝 잘려도 티 안 남) */
const SAME_RATIO = 0.03;

export function fitRects(srcW: number, srcH: number, dstW = POSTER_W, dstH = POSTER_H) {
  const cover = Math.max(dstW / srcW, dstH / srcH);
  const contain = Math.min(dstW / srcW, dstH / srcH);
  const sameRatio = Math.abs(srcW / srcH / (dstW / dstH) - 1) <= SAME_RATIO;
  const rect = (scale: number) => {
    const w = srcW * scale;
    const h = srcH * scale;
    return { x: (dstW - w) / 2, y: (dstH - h) / 2, w, h };
  };
  return { background: sameRatio ? null : rect(cover), image: rect(sameRatio ? cover : contain) };
}

export async function fitPosterImage(file: File): Promise<File> {
  return fitImage(file, POSTER_W, POSTER_H);
}

/** 사진을 w×h 칸에 맞춥니다(배너·사이드바 등 다른 크기에도 씀). */
export async function fitImage(file: File, width: number, height: number): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("이 사진 형식은 열 수 없습니다. JPG·PNG로 바꿔 올려 주세요.");
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 맞추지 못했습니다.");
  const { background, image } = fitRects(bitmap.width, bitmap.height, width, height);
  ctx.fillStyle = "#120b0b";
  ctx.fillRect(0, 0, width, height);
  if (background) {
    ctx.save();
    ctx.filter = "blur(36px) brightness(0.55)";
    ctx.drawImage(bitmap, background.x, background.y, background.w, background.h);
    ctx.restore();
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, image.x, image.y, image.w, image.h);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 맞추지 못했습니다."))), "image/jpeg", 0.9),
  );
  return new File([blob], "promo-image.jpg", { type: "image/jpeg" });
}

/** 글 사진: 비율은 그대로 두고 긴 쪽을 1600px 이하로 줄여 JPEG로 바꿉니다(휴대폰 원본 사진도 빠르게). */
export async function shrinkPhoto(file: File, maxSide = 1600): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("이 사진 형식은 열 수 없습니다. JPG·PNG로 바꿔 올려 주세요.");
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("사진을 줄이지 못했습니다.");
  // 투명 PNG는 검은 배경이 되지 않게 흰 바탕을 깝니다.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("사진을 줄이지 못했습니다."))), "image/jpeg", 0.85),
  );
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
