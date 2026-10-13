import { siteUrl } from "@/lib/site";

/**
 * IndexNow: 새 글 주소를 검색엔진(네이버·빙 등)에 바로 알립니다.
 * 키 파일은 public/<키>.txt 에 있고, 내용은 키 그대로입니다(공개해도 되는 값).
 */
export const INDEXNOW_KEY = "1e70e3406d5b51f9e5527e6b6410f399";

/** 공개되는 게시판만 알립니다(비밀글·익명·출석 제외). */
const PUBLIC_BOARDS = new Set(["JOBS", "NOTICE", "FREE", "HAND_REVIEW", "TDA", "SCHEDULE", "OFFICIAL_POSTER", "SKETCH", "RULE_QA"]);

export function shouldPingIndexNow(post: { boardType: string; isPrivate?: boolean; jobKind?: string | null }) {
  if (post.isPrivate || post.jobKind === "SEEKING") return false;
  return PUBLIC_BOARDS.has(post.boardType);
}

/** 실제 사이트(Vercel production)에서만 보냅니다. 실패해도 글쓰기에는 영향 없음. */
export async function pingIndexNow(paths: string[]) {
  if (process.env.VERCEL_ENV !== "production" || paths.length === 0) return;
  const base = siteUrl();
  const host = new URL(base).host;
  const urls = paths.map((path) => `${base}${path}`);
  const body = JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${base}/${INDEXNOW_KEY}.txt`, urlList: urls });
  const targets = ["https://api.indexnow.org/indexnow", "https://searchadvisor.naver.com/indexnow"];
  await Promise.allSettled(
    targets.map((target) =>
      fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body,
        signal: AbortSignal.timeout(4000),
      }),
    ),
  );
}
