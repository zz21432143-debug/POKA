import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OmokRoom } from "@/components/games/omok-room";
import { getCurrentUser } from "@/lib/current-user";
import { gamesOpen, hasYokai, omokState } from "@/lib/omok-server";
import { siteUrl } from "@/lib/site";
import { loadWinReward } from "@/lib/game-reward";

/** 카톡 · 메신저 미리보기: 「○○님의 요괴 오목 방 — 한 판 하자!」 · 방 코드 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { prisma } = await import("@/lib/db");
  const row = /^[a-z0-9]{10,40}$/i.test(id)
    ? await prisma.omokGame.findUnique({ where: { id }, select: { hostId: true, code: true, status: true } }).catch(() => null)
    : null;
  const host = row ? await prisma.user.findUnique({ where: { id: row.hostId }, select: { nickname: true } }).catch(() => null) : null;
  if (!row || !host) return metadata;
  const title = row.status === "playing" ? `${host.nickname}님의 요괴 오목 — 지금 대국 중! 관전하러 와요` : `${host.nickname}님의 요괴 오목 방 — 한 판 하자!`;
  const description = `${row.code ? `방 코드 ${row.code} · ` : ""}링크를 누르면 바로 자리에 앉거나 관전할 수 있어요. 흑 삼삼 금지 · 한 수 60초.`;
  return { ...metadata, title, description, openGraph: { ...metadata.openGraph, title, description } };
}

const metadata: Metadata = {
  title: "요괴 오목 대국",
  description:
    "POKA 요괴 오목 — 친구와 한 판! 링크나 방 코드로 들어와 착석하거나 관전하세요.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "요괴 오목 — 한 판 하자!",
    description: "POKA 요괴 오목 — 친구와 한 판! 링크나 방 코드로 들어와 착석하거나 관전하세요.",
    images: [{ url: "/images/og/yokai-village-og.jpg", width: 1200, height: 630, alt: "요괴 마을 — 요괴 게임방" }],
  },
};
export const dynamic = "force-dynamic";
/** 판 화면: 두 손가락 확대 · 두 번 탭 확대 막기(판이 흔들리지 않게) */
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

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
        className="game-back font-black inline-flex min-h-10 w-fit items-center text-sm text-[#ffcf4a]"
      >
        ← 요괴 오목
      </Link>
      <OmokRoom
        key={id}
        initial={state.view}
        loggedIn={Boolean(user)}
        hasYokai={yokai}
        shareUrl={`${siteUrl()}/games/omok/${id}?from=game-invite`}
        reward={await loadWinReward()}
      />
    </div>
  );
}
