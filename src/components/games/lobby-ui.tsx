"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "cn";

/** 로비 오른쪽 탭(랭킹 · 최근 대국 · 진행 중 · 내 기록) — 기록을 한 칸에 모음 */
export function LobbyTabs({
  tabs,
}: {
  tabs: { key: string; label: string; content: ReactNode }[];
}) {
  const [cur, setCur] = useState(tabs[0]?.key ?? "");
  const tab = tabs.find((t) => t.key === cur) ?? tabs[0];
  return (
    <section data-lobby-tabs className="arcade-panel grid gap-2 p-3">
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto [scrollbar-width:none]"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === tab?.key}
            data-lobby-tab={t.key}
            onClick={() => setCur(t.key)}
            className={cn(
              "min-h-10 shrink-0 rounded-lg px-3 text-sm font-black",
              t.key === tab?.key
                ? "bg-[#ffcf4a] text-[#2a1400]"
                : "bg-black/30 text-[#d6cdee] hover:bg-white/10",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-40">
        {tab?.content}
      </div>
    </section>
  );
}

/** 「📖 게임 규칙」 버튼 → 규칙 팝업 */
export function RulesButton({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        type="button"
        data-rules-open
        onClick={() => setOpen(true)}
        className="arcade-btn btn-dark !min-h-10 px-3 text-sm"
      >
        📖 게임 규칙
      </button>
      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4"
              onClick={() => setOpen(false)}
            >
              <div
                data-rules-modal
                className="arcade-root arcade-panel grid max-h-[85dvh] w-full max-w-lg gap-3 overflow-y-auto p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white">📖 {title}</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="arcade-btn btn-dark ml-auto !min-h-10 px-3 text-sm"
                  >
                    닫기
                  </button>
                </div>
                <div className="text-base text-[#d6cdee]">{children}</div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
