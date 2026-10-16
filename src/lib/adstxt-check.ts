import { prisma } from "@/lib/db";
import { adsensePublisherId } from "@/lib/adsense";

const SITE = "https://pokerwiki.co.kr";

/** 실제 사이트 ads.txt를 구글 광고 로봇처럼 열어 확인하고 기록(매일 · 관리 화면 「최근 자동 확인」) */
export async function checkAdsTxtLive() {
  const pub = adsensePublisherId()?.replace("ca-pub-", "") ?? "";
  let ok = false;
  let note = "";
  try {
    const res = await fetch(`${SITE}/ads.txt`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Mediapartners-Google)" }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const body = await res.text();
    ok = res.status === 200 && Boolean(pub) && body.includes(`pub-${pub}`);
    note = ok ? "정상" : `응답 ${res.status} · ID ${body.includes(`pub-${pub}`) ? "있음" : "없음"}`;
  } catch {
    note = "열리지 않음";
  }
  await prisma.auditLog.create({ data: { kind: "adstxt-check", ip: "-", detail: JSON.stringify({ ok, note }) } }).catch(() => undefined);
  return { ok, note };
}

/** 최근 자동 확인 기록(최신 먼저) */
export async function recentAdsTxtChecks(limit = 14) {
  const rows = await prisma.auditLog.findMany({ where: { kind: "adstxt-check" }, orderBy: { createdAt: "desc" }, take: limit }).catch(() => []);
  return rows.map((r) => {
    let d: { ok?: boolean; note?: string } = {};
    try {
      d = JSON.parse(r.detail ?? "{}");
    } catch {
      /* 무시 */
    }
    return { at: r.createdAt.toISOString(), ok: Boolean(d.ok), note: d.note ?? "" };
  });
}
