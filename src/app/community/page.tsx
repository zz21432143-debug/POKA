import Link from "next/link";
import { SIDEBAR_NAV } from "@/lib/nav";

export default function CommunityHubPage() {
  const community = SIDEBAR_NAV.find((group) => group.title === "커뮤니티");
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">커뮤니티</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          자유 게시판부터 핸드리뷰·구인까지, 같은 길을 걷는 사람들과 이야기하세요.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {community?.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="touch-target relative z-10 flex min-h-20 flex-col rounded-2xl border border-border bg-white p-4 shadow-sm hover:border-primary/40"
            >
              <p className="font-semibold">{item.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.hint}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
