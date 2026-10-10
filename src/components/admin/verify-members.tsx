"use client";

import Link from "next/link";
import { VerifyToggle } from "@/components/admin/verify-toggle";

export type VerifyMemberRow = {
  nickname: string;
  level: number;
  isDealerVerified: boolean;
  isAdmin: boolean;
};

export function VerifyMembers({ members }: { members: VerifyMemberRow[] }) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">검색된 계정이 없습니다.</p>;
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-[#1a1617]">
      {members.map((member) => (
        <li key={member.nickname} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link href={`/u/${encodeURIComponent(member.nickname)}`} className="truncate font-semibold hover:text-primary">
              {member.nickname}
            </Link>
            <p className="text-xs text-muted-foreground">
              Lv.{member.level}
              {member.isAdmin ? " · 관리자" : ""}
              {member.isDealerVerified ? " · 인증" : ""}
            </p>
          </div>
          <VerifyToggle nickname={member.nickname} verified={member.isDealerVerified} />
        </li>
      ))}
    </ul>
  );
}
