"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BoardNav } from "@/components/layout/board-nav";
import { ProfileWidget } from "@/components/layout/profile-widget";
import { PokaLogo } from "@/components/brand/poka-logo";
import { KakaoOpenChatCta } from "@/components/layout/kakao-open-chat-cta";
import type { ViewerProfile } from "@/lib/profile";
import type { SwitchAccount } from "@/lib/switch-account";

export function MobileDrawer({
  profile,
  accounts = [],
}: {
  profile: ViewerProfile | null;
  accounts?: SwitchAccount[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-touch"
            className="lg:hidden"
            aria-label="메뉴 열기"
          />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,20rem)] bg-white p-0" showCloseButton>
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <PokaLogo className="text-lg" />
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3">
            <KakaoOpenChatCta />
          </div>
          <div className="mb-3">
            <ProfileWidget profile={profile} accounts={accounts} />
          </div>
          <BoardNav onNavigate={() => setOpen(false)} />
          {profile?.isAdmin ? (
            <p className="mt-4 px-3 text-xs text-muted-foreground">관리자 메뉴는 헤더에서 열 수 있습니다.</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
