import { prisma } from "@/lib/db";

/** 운영을 끝낸 개인 구직 글(본명이 담긴 글) */
const SEEKING_WHERE = { boardType: "JOBS" as const, jobKind: "SEEKING" as const };

export async function countSeekingPosts() {
  return prisma.post.count({ where: SEEKING_WHERE });
}

/** 개인 구직 글을 완전히 지웁니다(댓글 · 지원 · 추천 등 딸린 기록도 함께). */
export async function purgeSeekingPosts() {
  const { count } = await prisma.post.deleteMany({ where: SEEKING_WHERE });
  return count;
}

/** 올린 지 이 기간이 안 된 사진은 지우지 않습니다(글을 쓰는 중일 수 있음). */
const IMAGE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const IMAGE_REF = /\/api\/images\/([a-z0-9]{20,40})/gi;

type ColumnRow = { table_name: string; column_name: string };

/**
 * DB 어디에도 주소(/api/images/…)가 남아 있지 않은 사진을 찾습니다.
 * 글 본문 · 사진 목록 · 배너 · 현황판 배경 · 설정 등 모든 글자 칸을 훑어서 한 곳이라도 쓰이면 남깁니다.
 */
export async function findUnusedImages() {
  const columns = await prisma.$queryRawUnsafe<ColumnRow[]>(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name <> 'UploadedImage' AND table_name NOT LIKE '\\_prisma%'
       AND data_type IN ('text', 'character varying', 'json', 'jsonb', 'ARRAY')`,
  );
  const used = new Set<string>();
  for (const { table_name, column_name } of columns) {
    const table = `"${table_name.replace(/"/g, "")}"`;
    const column = `"${column_name.replace(/"/g, "")}"`;
    const rows = await prisma.$queryRawUnsafe<{ v: string }[]>(
      `SELECT ${column}::text AS v FROM ${table} WHERE ${column}::text LIKE '%/api/images/%'`,
    );
    for (const row of rows) for (const match of row.v.matchAll(IMAGE_REF)) used.add(match[1]);
  }
  const candidates = await prisma.uploadedImage.findMany({
    where: { createdAt: { lt: new Date(Date.now() - IMAGE_GRACE_MS) } },
    select: { id: true, size: true },
  });
  const unused = candidates.filter((row) => !used.has(row.id));
  return { ids: unused.map((row) => row.id), bytes: unused.reduce((sum, row) => sum + (row.size ?? 0), 0) };
}

export async function purgeUnusedImages() {
  const { ids, bytes } = await findUnusedImages();
  if (ids.length === 0) return { count: 0, bytes: 0 };
  const { count } = await prisma.uploadedImage.deleteMany({ where: { id: { in: ids } } });
  return { count, bytes };
}
