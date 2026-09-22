import type { ReactNode } from "react";
import { BoardNav } from "@/components/layout/board-nav";
import { ProfileWidget } from "@/components/layout/profile-widget";
import { SiteHeader } from "@/components/layout/site-header";
import { getViewerProfile } from "@/lib/profile";
import { ensureTodayAttendancePost } from "@/lib/attendance";

export async function SiteShell({ children }: { children: ReactNode }) {
  let profile = null;
  try {
    await ensureTodayAttendancePost();
    profile = await getViewerProfile();
  } catch {
    profile = null;
  }

  return (
    <div className="felt-bg min-h-dvh">
      <SiteHeader profile={profile} />
      <div className="mx-auto flex w-full max-w-[1440px] items-start gap-0 lg:gap-4 lg:px-4">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col overflow-y-auto py-4 lg:flex">
          <BoardNav />
          <div className="mt-auto pt-4">
            <ProfileWidget profile={profile} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-3 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4">
          {children}
        </main>
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 overflow-y-auto py-4 lg:flex">
          <div className="flex flex-col gap-4">
            <ProfileWidget profile={profile} />
            <BoardNav />
          </div>
        </aside>
      </div>
    </div>
  );
}
