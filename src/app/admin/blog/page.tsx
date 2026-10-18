import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { blogDrafts } from "@/lib/blog-drafts";
import { blogPosted } from "@/lib/blog-posted";
import { BlogDrafts } from "@/components/admin/blog-drafts";

export const metadata: Metadata = { title: "블로그 글감", robots: { index: false } };
export const dynamic = "force-dynamic";

/** 네이버 블로그 글감: 가이드 요약 글을 복사해서 하루 1편씩 올리기 */
export default async function AdminBlogPage() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  const [drafts, posted] = [blogDrafts(), await blogPosted()];
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">📝 블로그 글감</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          하루 1편: 「제목 복사」 → 블로그 제목에 붙여넣기, 「본문 복사」 → 본문에, 「태그 복사」 → 태그 칸에. 사진 한 장(아래 「사진」 화면 캡처)과 직접 쓴 한두 줄을 넣고
          발행 → 「올렸어요」. 링크로 들어온 방문은 「방문 · 가입 · 유입」의 📝 블로그 줄에 잡혀요.
        </p>
      </header>
      <BlogDrafts drafts={drafts} initialPosted={posted} />
    </div>
  );
}
