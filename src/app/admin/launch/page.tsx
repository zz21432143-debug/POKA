import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LaunchResetPanel } from "@/components/admin/launch-reset-panel";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { RESET_GROUPS, type ResetGroup } from "@/lib/launch-reset";
import type { BoardType } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "오픈 준비", robots: { index: false } };

export const dynamic = "force-dynamic";

/** 마스터 전용. 임시 오픈 전에 테스트 게시물을 묶음별로 지웁니다. */
export default async function AdminLaunchPage() {
  const user = await getCurrentUser();
  if (!user?.isMaster) notFound();

  const keys = Object.keys(RESET_GROUPS) as ResetGroup[];
  const values = await Promise.all(
    keys.map((key) =>
      key === "attendance"
        ? prisma.post.count({ where: { isAttendanceThread: true } })
        : prisma.post.count({
            where: { boardType: { in: [...RESET_GROUPS[key].boards] as BoardType[] }, isAttendanceThread: false },
          }),
    ),
  );
  const counts = Object.fromEntries(keys.map((key, index) => [key, values[index] ?? 0])) as Record<ResetGroup, number>;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">오픈 준비 · 게시물 초기화</h1>
        <p className="mt-1 text-sm text-muted-foreground">임시 오픈 전에 테스트로 올린 글을 정리합니다.</p>
        <Link href="/admin" className="inline-flex min-h-11 items-center text-sm text-primary">
          관리자 페이지
        </Link>
      </header>
      <LaunchResetPanel counts={counts} />
    </div>
  );
}
