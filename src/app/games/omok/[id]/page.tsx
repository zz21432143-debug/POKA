import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OmokRoom } from "@/components/games/omok-room";
import { getCurrentUser } from "@/lib/current-user";
import { gamesOpen, omokState } from "@/lib/omok-server";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "요괴 오목 대국",
  description: "POKA 요괴 오목 — 친구와 한 판! 링크로 참가하거나 관전하세요.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** 친구 대전 방: 링크를 받은 사람은 참가, 누구나 관전(비공개 기간에도 링크로는 열림) */
export default async function OmokRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const user = await getCurrentUser().catch(() => null);
  const state = await omokState(id, user?.id ?? null).catch(() => null);
  if (!state || state.same) notFound();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
      {gamesOpen(user) ? (
        <Link
          href="/games/omok"
          className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]"
        >
          ← 요괴 오목
        </Link>
      ) : (
        <p className="pt-2 text-center text-sm font-black text-[#f3d9a4]">
          🏮 POKA 요괴 오목
        </p>
      )}
      <OmokRoom
        initial={state.view}
        loggedIn={Boolean(user)}
        shareUrl={`${siteUrl()}/games/omok/${id}`}
      />
    </div>
  );
}
