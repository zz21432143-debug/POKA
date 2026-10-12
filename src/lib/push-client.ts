/** 브라우저 푸시 구독 도우미(급구 알림·관리자 알림 공용). */
export function base64UrlToBytes(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function pushSupported(publicKey: string) {
  return Boolean(publicKey) && "serviceWorker" in navigator && "PushManager" in window;
}

/** 이 기기의 구독을 가져오거나 새로 만듭니다. */
export async function ensurePushSubscription(publicKey: string) {
  const reg = await navigator.serviceWorker.ready;
  return (
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }))
  );
}
