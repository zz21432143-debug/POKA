import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { YutRoom } from "@/components/games/yut-room";
import { getCurrentUser } from "@/lib/current-user";
import { profileYokai } from "@/lib/yokai-server";
import { yutState } from "@/lib/yut-server";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "요괴 윷놀이",
  description: "POKA 요괴 윷놀이 — 초대 링크로 들어와 홍팀 · 청팀 자리에 앉으세요!",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** 윷놀이 방: 링크 · 코드를 받은 사람은 자리에 앉고(요괴 필요), 누구나 관전 */
export default async function YutRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const user = await getCurrentUser().catch(() => null);
  const state = await yutState(id, user?.id ?? null).catch(() => null);
  if (!state || state.same) notFound();
  const yokai = user ? Boolean(await profileYokai(user.id).catch(() => null)) : false;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
      <Link href="/games/yut" className="inline-flex min-h-10 w-fit items-center text-sm font-black text-[#ffcf4a]">
        ← 요괴 윷놀이
      </Link>
      <YutRoom initial={state.view} loggedIn={Boolean(user)} hasYokai={yokai} shareUrl={`${siteUrl()}/games/yut/${id}`} />
    </div>
  );
}
