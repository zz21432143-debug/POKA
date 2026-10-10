import type { Metadata } from "next";
import Link from "next/link";
import { SIDEBAR_NAV } from "@/lib/nav";

export const metadata: Metadata = { title: "커뮤니티" };

export default function CommunityHubPage() {
  const community = SIDEBAR_NAV.find((group) => group.title === "커뮤니티");
  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <h1>커뮤니티</h1>
        <p className="mt-2">
          자유 게시판부터 핸드리뷰까지, 같은 길을 걷는 사람들과 이야기하세요.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {community?.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="ink-panel touch-target relative z-10 flex min-h-20 flex-col rounded-2xl p-4 hover:bg-[#241c1e]"
            >
              <p className="font-bold text-white">{item.label}</p>
              <p className="mt-1 text-sm text-[#9CA3AF]">{item.hint}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
