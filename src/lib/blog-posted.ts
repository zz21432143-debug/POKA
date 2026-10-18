import { prisma } from "@/lib/db";

/** ToolSaved 종류: 블로그에 올린 글감(name = 글감 키) */
export const BLOG_POSTED_KIND = "blog-posted";

/** 올린 글감 키 → 올린 날(한국 날짜) */
export async function blogPosted(): Promise<Record<string, string>> {
  const rows = await prisma.toolSaved.findMany({ where: { kind: BLOG_POSTED_KIND }, select: { name: true, createdAt: true }, take: 500 }).catch(() => []);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });
  return Object.fromEntries(rows.map((r) => [r.name, day.format(r.createdAt)]));
}
