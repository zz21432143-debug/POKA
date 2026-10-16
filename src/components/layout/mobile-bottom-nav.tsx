"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BriefcaseIcon,
  HomeIcon,
  LightbulbIcon,
  MessageCircleIcon,
  PenSquareIcon,
  UserRoundIcon,
} from "lucide-react";
import { cn } from "cn";
import { MOBILE_BOTTOM_NAV, mobileNavActive } from "@/lib/nav";

const ICONS = {
  home: HomeIcon,
  briefcase: BriefcaseIcon,
  message: MessageCircleIcon,
  write: PenSquareIcon,
  lightbulb: LightbulbIcon,
  user: UserRoundIcon,
};

export function MobileBottomNav() {
  const pathname = usePathname();
  // 댓글 · 검색 등 글자를 입력하는 동안은 숨김(키보드 위로 떠서 입력칸을 가리지 않게)
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isField = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || (t.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "range", "file"].includes((t as HTMLInputElement).type)) || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
    const onIn = (e: FocusEvent) => {
      if (isField(e.target)) setTyping(true);
    };
    const onOut = () => window.setTimeout(() => setTyping(isField(document.activeElement)), 50);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  if (typing) return null;
  // 글쓰기 화면은 키보드가 올라오면 아래 메뉴가 입력칸을 가려서 숨김(「등록」 버튼이 아래에 붙음)
  if (/\/(write|edit)(\/|$)/.test(pathname ?? "")) return null;

  return (
    <nav
      aria-label="모바일 하단 메뉴"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-[1560px] grid-cols-5 border-t border-[#c9a25c]/30 bg-[#120d0a]">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = ICONS[item.icon];
          const active = mobileNavActive(pathname, item);
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={cn(
                  "touch-target relative z-10 flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium",
                  active ? "text-[#e7c98a]" : "text-[#bfae94]",
                )}
              >
                <Icon className="size-5" />
                <span className="break-keep">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
