import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OmokRoom } from "@/components/games/omok-room";
import { getCurrentUser } from "@/lib/current-user";
import { gamesOpen, hasYokai, omokState } from "@/lib/omok-server";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "요괴 오목 대국",
  description:
    "POKA 요괴 오목 — 친구와 한 판! 링크나 방 코드로 들어와 착석하거나 관전하세요.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** 친구 대전 방: 링크 · 코드를 받은 사람은 착석(요괴 필요), 누구나 관전(비공개 기간에도 링크로는 열림) */
export default async function OmokRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const user = await getCurrentUser().catch(() => null);
  const state = await omokState(
    id,
    user?.id ?? null,
    undefined,
    undefined,
    true,
  ).catch(() => null);
  if (!state || state.same) notFound();
  const yokai = user ? await hasYokai(user.id) : false;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
      <Link
        href={gamesOpen(user) ? "/games/omok" : "/games/omok/join"}
        className="font-black inline-flex min-h-10 w-fit items-center text-sm text-[#ffcf4a]"
      >
        ← 요괴 오목
      </Link>
      <OmokRoom
        initial={state.view}
        loggedIn={Boolean(user)}
        hasYokai={yokai}
        shareUrl={`${siteUrl()}/games/omok/${id}`}
      />
    </div>
  );
}
