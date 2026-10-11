"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CalendarDaysIcon, ExternalLinkIcon, MapPinIcon, TrophyIcon, XIcon, ZoomInIcon } from "lucide-react";
import type { ScheduleEvent } from "@/components/listing/schedule-calendar";
import { LinkifiedText } from "@/components/posts/linkified-text";
import { dayLabel } from "@/lib/job-events";
import { loginHref } from "@/lib/login-path";

function dateText(start?: string | null, end?: string | null) {
  if (!start) return "";
  const a = `${start.slice(0, 4)}. ${dayLabel(start)}`;
  if (!end || end === start) return a;
  return `${a} ~ ${dayLabel(end)}`;
}

/** 달력에서 대회명을 누르면 뜨는 상세 창. Esc·바깥 누르기·닫기 버튼으로 닫습니다. */
export function ScheduleModal({
  event,
  loggedIn,
  onClose,
  color,
}: {
  event: ScheduleEvent;
  loggedIn: boolean;
  onClose: () => void;
  /** 캘린더에서 이 대회에 쓴 색 */
  color?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // 포스터만 크게 보기(원본 그대로, 화면 가득)
  const [posterOnly, setPosterOnly] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (posterOnly) setPosterOnly(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, posterOnly]);

  const place = event.promoLocation || event.jobLocation;
  const poster = event.poster && !event.poster.startsWith("/banners/") ? event.poster : null;

  // 사이트 머리(고정 헤더)보다 위에 뜨도록 body 바로 아래에 그립니다.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#c9a25c]/50 bg-[#1d1611] shadow-[0_20px_50px_rgb(0_0_0/0.6)] sm:rounded-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 grid size-10 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <XIcon className="size-5" />
        </button>
        <div className="overflow-y-auto overscroll-contain">
          {poster ? (
            // 포스터는 글자 인식 없이 원본 그대로, 자르지 않고 보여 줍니다. 누르면 포스터만 크게 봅니다.
            <button
              type="button"
              onClick={() => setPosterOnly(true)}
              className="group relative block w-full cursor-zoom-in bg-black"
              aria-label="포스터 크게 보기"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster} alt={`${event.title} 포스터`} className="mx-auto block h-auto max-h-[60dvh] w-auto max-w-full object-contain" />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold text-white opacity-80 group-hover:opacity-100">
                <ZoomInIcon className="size-3.5" />
                크게 보기
              </span>
            </button>
          ) : null}
          <div className="grid gap-3 p-4 sm:p-5">
            <h2 id="schedule-modal-title" className="flex items-center gap-2 pr-10 text-xl font-black leading-snug text-white">
              {color ? <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} /> : null}
              {event.title}
            </h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex items-start gap-2">
                <dt className="flex shrink-0 items-center gap-1 text-[#9CA3AF]">
                  <CalendarDaysIcon className="size-4 text-[#e7c98a]" />
                  일정
                </dt>
                <dd className="font-semibold text-white">{dateText(event.eventDate, event.eventEndDate) || "미정"}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="flex shrink-0 items-center gap-1 text-[#9CA3AF]">
                  <MapPinIcon className="size-4 text-[#e7c98a]" />
                  장소
                </dt>
                <dd className="text-white">{place || "미정"}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="flex shrink-0 items-center gap-1 text-[#9CA3AF]">
                  <TrophyIcon className="size-4 text-[#e7c98a]" />
                  총상금
                </dt>
                <dd className="font-bold text-[#e7c98a]">{event.eventPrize || "—"}</dd>
              </div>
            </dl>
            {event.eventLink ? (
              <a
                href={event.eventLink}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="touch-target flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-[#c9a25c] text-sm font-bold text-[#1d1611] hover:bg-[#e7c98a]"
              >
                공식 링크 열기
                <ExternalLinkIcon className="size-4" />
              </a>
            ) : null}
            <section aria-label="상세 내용" className="rounded-xl border border-[#3a332c] bg-[#141110] p-3">
              <p className="mb-1.5 text-xs font-semibold text-[#9CA3AF]">상세 내용</p>
              {loggedIn ? (
                event.content ? (
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#E5E7EB]">
                    <LinkifiedText text={event.content} />
                  </div>
                ) : (
                  <p className="text-sm text-[#9CA3AF]">등록된 상세 내용이 없습니다.</p>
                )
              ) : (
                <p className="text-sm text-[#c9c0b2]">
                  상세 내용은 로그인 후 볼 수 있습니다.{" "}
                  <Link href={loginHref(`/posts/${event.id}`)} className="font-bold text-[#e7c98a] underline">
                    로그인
                  </Link>
                </p>
              )}
            </section>
            <Link href={`/posts/${event.id}`} className="text-center text-xs font-semibold text-[#9CA3AF] underline">
              게시글로 보기 · 댓글
            </Link>
          </div>
        </div>
      </div>
      {posterOnly && poster ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black" role="dialog" aria-modal="true" aria-label="포스터 원본">
          <button type="button" aria-label="포스터 닫기" className="absolute inset-0 cursor-zoom-out" onClick={() => setPosterOnly(false)} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt={`${event.title} 포스터 원본`} className="relative max-h-[100dvh] max-w-full object-contain" />
          <button
            type="button"
            aria-label="포스터 닫기"
            onClick={() => setPosterOnly(false)}
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <XIcon className="size-6" />
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
