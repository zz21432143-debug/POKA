"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, ShareIcon, PlusSquareIcon, SmartphoneIcon, XIcon } from "lucide-react";

import { STRIP_HIDE_MS, STRIP_KEY } from "@/lib/app-strip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && webkit;
}

/** 카카오톡 · 네이버 · 인스타그램 · 페이스북 · 라인 같은 앱 안 브라우저(여기서는 홈 화면 설치가 안 됨) */
function inAppBrowser(): "kakao" | "other" | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps|everytimeApp|BAND\/|SamsungBrowser\/[\d.]+ CrossApp/i.test(ua)) return "other";
  return null;
}

/** 앱 안 브라우저에서 바깥 브라우저(사파리 · 크롬)로 지금 페이지 열기 */
function openOutside(kind: "kakao" | "other") {
  const url = window.location.href;
  if (kind === "kakao") {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    return true;
  }
  if (/Android/i.test(navigator.userAgent)) {
    const u = new URL(url);
    window.location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
    return true;
  }
  return false;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || isIosSafari();
}

export function InstallPwaButton({
  compact = false,
  variant,
}: {
  compact?: boolean;
  /** header: 상단 바 아이콘 버튼 · strip: 휴대폰 화면 상단 "POKA 앱 다운로드" 띠 */
  variant?: "header" | "strip";
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosOpen, setIosOpen] = useState(false);
  const [androidOpen, setAndroidOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [inAppOpen, setInAppOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [stripClosed, setStripClosed] = useState(false);

  useEffect(() => {
    const check = window.setTimeout(() => setInstalled(isStandalone()), 0);
    // <head>에서 미리 받아 둔 설치 창(화면이 그려지기 전에 온 경우)
    const take = () => {
      const early = (window as Window & { __pokaInstall?: BeforeInstallPromptEvent | null }).__pokaInstall;
      if (early) setDeferred(early);
    };
    const early = window.setTimeout(take, 0);
    window.addEventListener("poka-install-ready", take);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(check);
      window.clearTimeout(early);
      window.removeEventListener("poka-install-ready", take);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // 설치한 앱으로 열었을 때와 띠를 닫아 둔 경우는 첫 화면부터 CSS가 숨깁니다(globals.css의 app-get).
  // 여기서는 화면을 연 뒤에 설치·닫기를 한 경우만 처리합니다.
  if (installed) return null;
  if (variant === "strip" && stripClosed) return null;

  function closeStrip() {
    try {
      window.localStorage.setItem(STRIP_KEY, String(Date.now() + STRIP_HIDE_MS));
    } catch {
      // 저장소를 못 쓰면 이번 화면에서만 닫습니다.
    }
    setStripClosed(true);
  }

  async function install() {
    // 카톡 등 앱 안 브라우저: 설치 메뉴가 없어서 바깥 브라우저로 열고, 거기서 다시 받기
    const inApp = inAppBrowser();
    if (inApp) {
      openOutside(inApp);
      setInAppOpen(true);
      return;
    }
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      (window as Window & { __pokaInstall?: unknown }).__pokaInstall = null;
      return;
    }
    if (isIosSafari()) {
      setIosOpen(true);
      return;
    }
    if (!isMobileDevice()) {
      setDesktopOpen(true);
      return;
    }
    setAndroidOpen(true);
  }

  const label = compact ? "앱 설치" : "홈 화면에 추가";
  const siteHost = typeof window === "undefined" ? "pokerwiki.co.kr" : window.location.host;

  return (
    <>
      {variant === "strip" ? (
        <div className="app-get app-get-strip flex items-center gap-2 border-b border-[#c9a25c]/25 bg-[#2a2017] px-3 py-0.5 lg:hidden">
          <SmartphoneIcon className="size-4 shrink-0 text-[#e7c98a]" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-xs text-[#f3eadb]">
            <strong className="font-bold">POKA 앱</strong>
            <span className="text-[#d1c7b5]"> · 급구 알림 받기</span>
          </p>
          <button
            type="button"
            onClick={() => void install()}
            className="relative inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#c9a25c] px-2.5 text-xs font-bold text-[#1d1611] before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] hover:bg-[#e7c98a]"
          >
            <DownloadIcon className="size-3.5" />
            받기
          </button>
          <button
            type="button"
            onClick={closeStrip}
            aria-label="앱 다운로드 안내 닫기"
            className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#d1c7b5] before:absolute before:-inset-1.5 before:content-[''] hover:bg-white/10"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ) : variant === "header" ? (
        <button
          type="button"
          onClick={() => void install()}
          aria-label="POKA 앱 받기"
          className="app-get touch-target inline-flex size-10 shrink-0 items-center justify-center gap-1 rounded-full border border-[#c9a25c]/60 bg-[#2a2017] text-[13px] font-bold text-[#f3eadb] hover:border-[#c9a25c] hover:bg-[#3a2c1f] sm:w-auto sm:px-3"
        >
          <SmartphoneIcon className="size-4 shrink-0 text-[#e7c98a]" />
          {/* 휴대폰에서는 로고가 가려지지 않도록 아이콘만 보입니다. */}
          <span className="hidden sm:inline">POKA 앱 받기</span>
        </button>
      ) : (
      <Button
        type="button"
        size={compact ? "icon-touch" : "touch"}
        variant={compact ? "ghost" : "outline"}
        className={
          compact
            ? "text-white hover:bg-white/10 hover:text-white"
            : "w-full justify-start"
        }
        onClick={() => void install()}
        aria-label="홈 화면에 추가"
      >
        <DownloadIcon className="size-5" />
        {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
      </Button>
      )}

      <Dialog open={desktopOpen} onOpenChange={setDesktopOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>PC에 POKA 앱 설치</DialogTitle>
            <DialogDescription>
              POKA는 앱스토어 없이 PC에 바로 설치됩니다. 설치하면 바탕화면·작업표시줄에 POKA 아이콘이 생기고 창 하나로 열립니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-sm leading-6">
            <section>
              <p className="font-bold">크롬 · 엣지 · 웨일</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li className="break-words">
                  주소창 오른쪽 끝의 <strong>설치 아이콘</strong>(모니터에 화살표 모양)을 누릅니다.
                </li>
                <li className="break-words">
                  안 보이면 오른쪽 위 메뉴(⋮ 또는 …) → <strong>POKA 설치</strong> 또는 <strong>앱 → 이 사이트를 앱으로 설치</strong>를 누릅니다.
                </li>
              </ol>
            </section>
            <section>
              <p className="font-bold">맥 사파리</p>
              <p>
                위 메뉴 <strong>파일 → Dock에 추가</strong>를 누릅니다.
              </p>
            </section>
            <section className="rounded-lg bg-muted/40 p-3">
              <p className="font-bold">휴대폰에 받기</p>
              <p className="break-words">
                휴대폰 브라우저에서 <strong>{siteHost}</strong> 에 접속해 위쪽 <strong>앱</strong> 버튼을 누르세요. 아이폰은 공유{" "}
                <ShareIcon className="inline size-4 align-text-bottom" /> → <strong>홈 화면에 추가</strong>입니다.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={inAppOpen} onOpenChange={setInAppOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>브라우저에서 POKA 앱 받기</DialogTitle>
            <DialogDescription>
              카카오톡 · 네이버 · 인스타그램 안에서는 앱을 설치할 수 없어요. <strong>사파리 · 크롬</strong>으로 열어서 다시 <strong>받기</strong>를 눌러 주세요.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6">
            <li>
              아래 <strong>브라우저로 열기</strong>를 누르거나, 오른쪽 위(또는 아래) <strong>⋮ · 공유</strong> 메뉴에서 <strong>다른 브라우저로 열기 · Safari로 열기</strong>를 고릅니다.
            </li>
            <li>열린 브라우저에서 위쪽 <strong>POKA 앱 · 받기</strong>를 누릅니다.</li>
          </ol>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openOutside(inAppBrowser() ?? "other")}
              className="min-h-11 rounded-xl bg-[#c9a25c] text-sm font-bold text-[#1d1611]"
            >
              브라우저로 열기
            </button>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(window.location.href)}
              className="min-h-11 rounded-xl border border-white/20 text-sm font-bold"
            >
              주소 복사
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>홈 화면에 POKA 추가</DialogTitle>
            <DialogDescription>
              iPhone·iPad Safari에서는 브라우저가 설치 창을 띄울 수 없습니다. 아래 순서로 바로가기를 만드세요.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-6">
            <li className="break-words">
              하단의 <ShareIcon className="inline size-4 align-text-bottom" /> 공유 버튼을 누릅니다.
            </li>
            <li className="break-words">
              <PlusSquareIcon className="inline size-4 align-text-bottom" /> <strong>홈 화면에 추가</strong>를
              선택합니다.
            </li>
            <li className="break-words">추가를 누르면 바탕화면에 POKA 아이콘이 생기고, 앱처럼 실행됩니다.</li>
          </ol>
        </DialogContent>
      </Dialog>

      <Dialog open={androidOpen} onOpenChange={setAndroidOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>홈 화면에 POKA 추가</DialogTitle>
            <DialogDescription>
              Chrome·Samsung Internet에서 메뉴의 <strong>앱 설치</strong> 또는{" "}
              <strong>홈 화면에 추가</strong>를 누르면 POKA 아이콘이 바탕화면에 생깁니다. 설치 후 주소창 없이
              앱처럼 열립니다.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">
            설치 안내가 안 보이면 주소창 옆 메뉴(⋮) → 홈 화면에 추가를 확인하세요.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
