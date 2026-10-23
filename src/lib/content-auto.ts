import { prisma } from "@/lib/db";

/** 콘텐츠 자동 발행 켜짐 여부(사이트 설정 한 줄 · 기본 켜짐) */
const SETTING_ID = "content-auto-publish";

export async function autoPublishOn() {
  const row = await prisma.toolSaved.findUnique({ where: { id: SETTING_ID }, select: { dataJson: true } }).catch(() => null);
  if (!row) return true;
  try {
    return (JSON.parse(row.dataJson) as { on?: boolean }).on !== false;
  } catch {
    return true;
  }
}

export async function setAutoPublish(on: boolean) {
  await prisma.toolSaved.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, ownerId: "site", kind: "site-setting", name: SETTING_ID, dataJson: JSON.stringify({ on }) },
    update: { dataJson: JSON.stringify({ on }) },
  });
}

/** 지금 한국 시각의 요일 글자(월~일) · "HH:MM" */
export function kstNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: get("weekday").replace("요일", ""), time: `${get("hour")}:${get("minute")}` };
}
