import webpush from "web-push";
import { prisma } from "@/lib/db";

/**
 * 급구 웹 푸시. Vercel 환경변수 세 개가 있어야 동작합니다.
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT(mailto:주소)
 * 없으면 구독 버튼이 숨고 발송도 건너뜁니다.
 */
export function vapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
}

let configured = false;

function configure() {
  if (configured) return true;
  const publicKey = vapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:POKA4444444@gmail.com";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function pushEnabled() {
  return Boolean(vapidPublicKey() && process.env.VAPID_PRIVATE_KEY?.trim());
}

export type PushPayload = { title: string; body: string; url: string };

/** 지역 구독자에게 새 급구를 알립니다. */
export async function notifyRegion(region: string, payload: PushPayload) {
  if (!configure()) return { sent: 0 };
  const subs = await prisma.pushSubscription.findMany({ where: { region }, take: 2000 });
  return sendAll(subs, payload);
}

/** 관리자 알림을 켜 둔 기기(지금도 관리자인 회원)에 보냅니다. 새 광고·홍보 문의 등. */
export async function notifyAdmins(payload: PushPayload) {
  if (!configure()) return { sent: 0 };
  const subs = await prisma.pushSubscription.findMany({
    where: { adminAlerts: true, user: { OR: [{ isAdmin: true }, { isMaster: true }, { role: { in: ["ADMIN", "MASTER"] } }] } },
    take: 50,
  });
  return sendAll(subs, payload);
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** 만료된 구독(404/410)은 지웁니다. */
async function sendAll(subs: Sub[], payload: PushPayload) {
  let sent = 0;
  const gone: string[] = [];
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 6 },
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(sub.id);
      }
    }),
  );
  if (gone.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
  return { sent };
}
