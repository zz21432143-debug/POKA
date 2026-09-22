"use client";

import { useState } from "react";
import Link from "next/link";
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
import type { ViewerProfile } from "@/lib/profile";

export function MobileDrawer({ profile }: { profile: ViewerProfile | null }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon-touch"
            className="lg:hidden"
            aria-label="게시판 메뉴 열기"
          />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,20rem)] p-0" showCloseButton>
        <SheetHeader className="border-b border-border">
          <SheetTitle>전체 게시판</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="touch-target flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted"
          >
            메인
          </Link>
          <BoardNav onNavigate={() => setOpen(false)} />
          <ProfileWidget profile={profile} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
