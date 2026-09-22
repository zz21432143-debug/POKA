import type { ReactNode } from "react";
import { BoardNav } from "@/components/layout/board-nav";
import { ProfileWidget } from "@/components/layout/profile-widget";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PopularPosts } from "@/components/layout/popular-posts";
import { NoticeWidget } from "@/components/layout/notice-widget";
import { PromoApplyCta } from "@/components/layout/promo-apply-cta";
import { TalkCta } from "@/components/layout/talk-cta";
import { SponsorBanner } from "@/components/ads/sponsor-banner";
import { getViewerProfile } from "@/lib/profile";
import { ensureTodayAttendancePost } from "@/lib/attendance";
import { getTickerEvents } from "@/lib/ticker";

export async function SiteShell({ children }: { children: ReactNode }) {
  let profile = null;
  let notices: { id: string; title: string; date: string; href: string }[] = [];
  try {
    await ensureTodayAttendancePost();
    const [viewer, events] = await Promise.all([getViewerProfile(), getTickerEvents()]);
    profile = viewer;
    notices = events.slice(0, 4).map((event) => ({
      id: event.id,
      title: event.message.replace(/^[^ ]+\s/, "").slice(0, 28),
      date: event.createdAt
        ? new Date(event.createdAt).toISOString().slice(0, 10).replaceAll("-", ".")
        : "",
      href: event.href,
    }));
  } catch {
    profile = null;
  }

  const fallbackNotices = [
    { id: "n1", title: "2025년 4월 운영 정책 안내", date: "2025.04.10", href: "/terms" },
    { id: "n2", title: "게시판 이용 규칙 안내", date: "2025.04.05", href: "/about" },
    { id: "n3", title: "포카 커뮤니티 이벤트 안내", date: "2025.03.28", href: "/boards/schedule" },
  ];

  return (
    <div className="felt-bg flex min-h-dvh flex-col">
      <div className="sticky top-0 z-40 bg-white [transform:translateZ(0)]">
        <SiteHeader profile={profile} noticeCount={notices.length || 3} />
      </div>
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 items-start gap-5 px-3 py-5 sm:px-5">
        <aside className="sticky top-[5.25rem] hidden h-[calc(100dvh-5.5rem)] w-[15.5rem] shrink-0 overflow-y-auto rounded-2xl border border-border bg-white p-3 shadow-sm lg:block">
          <BoardNav />
        </aside>
        <main className="min-w-0 flex-1 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
          <div className="mt-5 xl:hidden">
            <SponsorBanner />
          </div>
        </main>
        <aside className="sticky top-[5.25rem] hidden h-[calc(100dvh-5.5rem)] w-[18.5rem] shrink-0 overflow-y-auto xl:flex">
          <div className="flex w-full flex-col gap-3 pb-6">
            <ProfileWidget profile={profile} />
            <SponsorBanner />
            <PromoApplyCta />
            <NoticeWidget items={notices.length > 0 ? notices : fallbackNotices} />
            <PopularPosts />
            <TalkCta />
          </div>
        </aside>
      </div>
      <SiteFooter />
    </div>
  );
}
