import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { ContentPlanPublisher } from "@/components/admin/content-plan-publisher";
import { loadPublishItems } from "@/lib/content-publish";
import { AutoPublishToggle } from "@/components/admin/auto-publish-toggle";
import { autoPublishOn } from "@/lib/content-auto";

export const metadata: Metadata = { title: "콘텐츠 발행", robots: { index: false } };

export const dynamic = "force-dynamic";

/** 1주일 콘텐츠(14개)를 POKA 계정으로 올리는 화면. 마스터 계정만 씁니다. */
export default async function AdminContentPage() {
  const user = await getCurrentUser();
  if (!user?.isMaster) notFound();
  const [items, auto] = await Promise.all([loadPublishItems(user), autoPublishOn()]);
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">콘텐츠 발행</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          1주일 콘텐츠 14개를 POKA 계정으로 올립니다. 요일·시간에 맞춰 하나씩 올리거나, 준비된 글을 한 번에 올릴 수 있습니다.
          올리기 전에 제목과 본문을 고칠 수 있습니다. 〔 〕가 남아 있는 글은 실제 내용(사진·결과)을 채워야 올라갑니다.
        </p>
      </header>
      <AutoPublishToggle initialOn={auto} />
      <ContentPlanPublisher items={items} />
    </div>
  );
}
