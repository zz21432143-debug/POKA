"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

export function NicknameMenu({
  nickname,
  children,
}: {
  nickname: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const profileHref = `/u/${encodeURIComponent(nickname)}`;
  const postsHref = `${profileHref}/posts`;

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative inline-flex max-w-full">
      <button
        type="button"
        className="touch-target inline-flex max-w-full min-h-11 items-center rounded-lg text-left hover:bg-muted/70"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        {children}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute top-full left-0 z-50 mt-1 min-w-40 rounded-xl border border-border bg-[#1a1617] p-1 text-[#e5e7eb] shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <Link
            role="menuitem"
            href={profileHref}
            className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            프로필 보기
          </Link>
          <Link
            role="menuitem"
            href={postsHref}
            className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            작성 글 보기
          </Link>
        </div>
      ) : null}
    </div>
  );
}
