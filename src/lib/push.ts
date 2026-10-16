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
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:POKA4444444@gmail.com";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function pushEnabled() {
  return Boolean(vapidPublicKey() && process.env.VAPID_PRIVATE_KEY?.trim());
}

export type PushPayload = { title: string; body: string; url: string };

/** 브라우저 푸시 서비스 주소만 받습니다(아무 서버로나 요청이 가지 않게). */
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "push.apple.com",
  "push.services.mozilla.com",
  "notify.windows.com",
];

export function isPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      PUSH_HOSTS.some((base) => host === base || host.endsWith(`.${base}`))
    );
  } catch {
    return false;
  }
}

/** 그 지역 구독자 + "전국" 구독자에게 새 급구를 알립니다. */
export async function notifyRegion(region: string, payload: PushPayload) {
  if (!configure()) return { sent: 0 };
  const subs = await prisma.pushSubscription.findMany({
    where: { region: { in: [region, "전국"] } },
    take: 5000,
  });
  return sendAll(subs, payload);
}

/** 관리자 알림을 켜 둔 기기(지금도 관리자인 회원)에 보냅니다. 새 광고·홍보 문의 등. */
export async function notifyAdmins(payload: PushPayload) {
  if (!configure()) return { sent: 0 };
  const subs = await prisma.pushSubscription.findMany({
    where: {
      adminAlerts: true,
      user: {
        OR: [
          { isAdmin: true },
          { isMaster: true },
          { role: { in: ["ADMIN", "MASTER"] } },
        ],
      },
    },
    take: 50,
  });
  return sendAll(subs, payload);
}

/** 이 회원이 알림을 켠 기기(관리자 테스트 알림용) */
export async function notifyUser(userId: string, payload: PushPayload) {
  if (!configure()) return { sent: 0, total: 0 };
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    take: 20,
  });
  return { ...(await sendAll(subs, payload)), total: subs.length };
}

/** 관리자 공지 알림: region이 없으면 급구 알림을 켠 모든 기기, 있으면 그 지역 + 전국 */
export async function notifyBroadcast(
  region: string | null,
  payload: PushPayload,
) {
  if (!configure()) return { sent: 0, total: 0 };
  const subs = await prisma.pushSubscription.findMany({
    where: region
      ? { region: { in: [region, "전국"] } }
      : { region: { not: "" } },
    take: 20000,
  });
  return { ...(await sendAll(subs, payload)), total: subs.length };
}

/** 오늘의 퀴즈 알림을 켠 기기 */
export async function notifyQuiz(payload: PushPayload) {
  if (!configure()) return { sent: 0, total: 0 };
  const subs = await prisma.pushSubscription.findMany({
    where: { quizAlerts: true },
    take: 20000,
  });
  return { ...(await sendAll(subs, payload)), total: subs.length };
}

/** 오락실 상대 찾기 알림을 켠 기기(방장 본인 기기는 빼고) */
export async function notifyGameAlert(exceptUserId: string, payload: PushPayload) {
  if (!configure()) return { sent: 0, total: 0 };
  const subs = await prisma.pushSubscription.findMany({
    where: { gameAlerts: true, OR: [{ userId: null }, { userId: { not: exceptUserId } }] },
    take: 20000,
  });
  return { ...(await sendAll(subs, payload)), total: subs.length };
}

/** 출석 1등 알림(밤 12시)을 켠 기기 */
export async function notifyAttend(payload: PushPayload) {
  if (!configure()) return { sent: 0, total: 0 };
  const subs = await prisma.pushSubscription.findMany({
    where: { attendAlerts: true },
    take: 20000,
  });
  return { ...(await sendAll(subs, payload)), total: subs.length };
}

/** 요괴 마을 알림을 켠 이 회원의 기기 */
export async function notifyYokaiUser(userId: string, payload: PushPayload) {
  if (!configure()) return { sent: 0 };
  const subs = await prisma.pushSubscription.findMany({
    where: { userId, yokaiAlerts: true },
    take: 10,
  });
  return sendAll(subs, payload);
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** 만료된 구독(404/410)은 지웁니다. */
async function sendAll(subs: Sub[], payload: PushPayload) {
  let sent = 0;
  const gone: string[] = [];
  // 한 번에 너무 많이 열지 않게 200개씩 나눠 보냅니다.
  for (let i = 0; i < subs.length; i += 200) {
    await Promise.allSettled(
      subs.slice(i, i + 200).map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
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
  }
  if (gone.length)
    await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
  return { sent };
}
