import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { AdminNav } from "@/components/admin/admin-nav";
import { TitleAdmin } from "@/components/admin/title-admin";

export const metadata: Metadata = { title: "칭호 관리", robots: { index: false } };
export const dynamic = "force-dynamic";

/** 팟 계산 칭호 관리: 지금 칭호 · 설정(마스터) · 랭킹 기록 관리(마스터) */
export default async function AdminTitlesPage() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">칭호 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          「팟 계산」 랭킹 1~3위가 닉네임 옆에 칭호를 받습니다. 칭호 이름 · 기준 난이도 · 기간을 정하고, 부정 기록은 지우거나 칭호에서 뺄 수 있습니다.
          {user.isMaster ? "" : " (설정 변경과 기록 삭제는 마스터 계정만 할 수 있습니다.)"}
        </p>
        <div className="mt-2">
          <AdminNav current="/admin/titles" isMaster={user.isMaster} />
        </div>
      </header>
      <TitleAdmin canEdit={Boolean(user.isMaster)} />
    </div>
  );
}
