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
import { PokaLogo } from "@/components/brand/poka-logo";
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
          <SheetTitle className="flex items-center gap-2">
            <PokaLogo className="text-lg" />
            <span>전체 게시판</span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="touch-target flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted"
          >
            메인
          </Link>
          <Link
            href="/shop"
            onClick={() => setOpen(false)}
            className="touch-target flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted"
          >
            마크 상점
          </Link>
          {profile?.isAdmin ? (
            <>
              <Link
                href="/admin/banners"
                onClick={() => setOpen(false)}
                className="touch-target flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted"
              >
                배너 구좌
              </Link>
              <Link
                href="/admin/reports"
                onClick={() => setOpen(false)}
                className="touch-target flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted"
              >
                신고 처리
              </Link>
            </>
          ) : null}
          <BoardNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
