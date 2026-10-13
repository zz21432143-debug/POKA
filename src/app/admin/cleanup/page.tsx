import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AdminNav } from "@/components/admin/admin-nav";
import { CleanupPanel } from "@/components/admin/cleanup-panel";
import { countSeekingPosts, findUnusedImages } from "@/lib/data-cleanup";

export const metadata: Metadata = { title: "데이터 정리", robots: { index: false } };
export const dynamic = "force-dynamic";

/** 마스터 전용: 예전 개인 구직 글 삭제 · 안 쓰는 사진 정리 */
export default async function AdminCleanupPage() {
  const user = await getCurrentUser();
  if (!user?.isMaster) notFound();
  const [seeking, unused] = await Promise.all([countSeekingPosts(), findUnusedImages()]);
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">데이터 정리</h1>
        <p className="mt-1 text-sm text-muted-foreground">개인정보가 담긴 예전 글과 쓰이지 않는 사진을 지웁니다. 지운 것은 되돌릴 수 없어요.</p>
        <div className="mt-2">
          <AdminNav current="/admin/cleanup" isMaster />
        </div>
      </header>
      <CleanupPanel seeking={seeking} images={unused.ids.length} imageBytes={unused.bytes} />
    </div>
  );
}
