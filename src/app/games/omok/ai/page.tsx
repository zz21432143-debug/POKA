import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OmokAi } from "@/components/games/omok-ai";
import { getCurrentUser } from "@/lib/current-user";
import { OMOK_OPPONENTS } from "@/lib/omok-lines";
import { gamesOpen } from "@/lib/omok-server";
import { profileYokai } from "@/lib/yokai-server";

export const metadata: Metadata = {
  title: "요괴 오목 · 요괴와 대국",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** 요괴 AI 대국(?vs=0~3) */
export default async function OmokAiPage({
  searchParams,
}: {
  searchParams: Promise<{ vs?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpen(user)) notFound();
  const { vs } = await searchParams;
  const index = Math.min(
    OMOK_OPPONENTS.length - 1,
    Math.max(0, Math.floor(Number(vs)) || 0),
  );
  const yk = user ? await profileYokai(user.id).catch(() => null) : null;
  // 요괴가 없으면 요괴 고르기로(고르면 바로 돌아옴)
  if (user && !yk)
    redirect(`/yokai?next=${encodeURIComponent(`/games/omok/ai?vs=${index}`)}`);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
      <Link
        href="/games/omok"
        className="font-black inline-flex min-h-10 w-fit items-center text-sm text-[#ffcf4a]"
      >
        ← 요괴 오목
      </Link>
      <OmokAi
        key={index}
        opponent={index}
        me={{
          nickname: user?.nickname ?? "나",
          yokai: yk ? { species: yk.species, stage: yk.stage } : null,
        }}
      />
    </div>
  );
}
