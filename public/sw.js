const CACHE = "poka-pwa-v2";
const PRECACHE = ["/icons/poka-192.png", "/icons/poka-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // 문서 이동(뒤로가기 포함)은 브라우저에 맡깁니다. 예전엔 실패 시 홈 캐시를 줘서 뒤로가기가 홈으로 튕겼습니다.
  if (request.mode === "navigate" || request.destination === "document") return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        if (response.ok && response.type === "basic") {
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});

// 급구 웹 푸시. 서버(src/lib/push.ts)가 { title, body, url } 을 보냅니다.
self.addEventListener("push", (event) => {
  let data = { title: "POKA 급구 알림", body: "새 급구/대타가 올라왔습니다.", url: "/boards/jobs/urgent" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // 형식이 다르면 기본 문구로 보냅니다.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/poka-192.png",
      badge: "/icons/poka-192.png",
      data: { url: data.url },
      tag: data.url,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url === target);
      if (open) return open.focus();
      return self.clients.openWindow(target);
    }),
  );
});
