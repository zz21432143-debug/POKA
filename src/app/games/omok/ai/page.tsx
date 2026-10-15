import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
      <Link
        href="/games/omok"
        className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]"
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
