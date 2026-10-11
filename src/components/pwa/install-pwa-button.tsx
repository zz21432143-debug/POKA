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
  const [installed, setInstalled] = useState(false);
  const [stripClosed, setStripClosed] = useState(false);

  useEffect(() => {
    const check = window.setTimeout(() => setInstalled(isStandalone()), 0);
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
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
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
        <div className="app-get app-get-strip flex items-center gap-2 border-b border-[#c9a25c]/30 bg-[#2a2017] px-3 py-2 lg:hidden">
          <SmartphoneIcon className="size-5 shrink-0 text-[#e7c98a]" aria-hidden />
          <p className="min-w-0 flex-1 text-[13px] leading-tight text-[#f3eadb]">
            <strong className="block font-bold">POKA 앱 다운로드</strong>
            <span className="block truncate text-xs text-[#d1c7b5]">홈 화면에 추가하고 급구 알림 받기</span>
          </p>
          <button
            type="button"
            onClick={() => void install()}
            className="touch-target inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#c9a25c] px-3.5 text-[13px] font-bold text-[#1d1611] hover:bg-[#e7c98a]"
          >
            <DownloadIcon className="size-4" />
            다운로드
          </button>
          <button
            type="button"
            onClick={closeStrip}
            aria-label="앱 다운로드 안내 닫기"
            className="touch-target inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[#d1c7b5] hover:bg-white/10"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ) : variant === "header" ? (
        <button
          type="button"
          onClick={() => void install()}
          aria-label="휴대폰에 POKA 앱 받기"
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
            <DialogTitle>휴대폰에 POKA 앱 받기</DialogTitle>
            <DialogDescription>
              POKA는 앱스토어 없이 휴대폰 홈 화면에 바로 설치됩니다. 설치하면 주소창 없이 앱처럼 열립니다.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-6">
            <li className="break-words">
              휴대폰 브라우저에서 <strong>{siteHost}</strong> 에 접속합니다.
            </li>
            <li className="break-words">
              상단의 <strong>앱</strong> 버튼을 누릅니다.
            </li>
            <li className="break-words">
              안드로이드는 <strong>설치</strong>, 아이폰은 공유 <ShareIcon className="inline size-4 align-text-bottom" /> →{" "}
              <strong>홈 화면에 추가</strong>를 누르면 끝입니다.
            </li>
          </ol>
          {deferred ? null : (
            <p className="text-xs leading-5 text-muted-foreground">
              이 PC에도 설치하려면 주소창 오른쪽의 설치 아이콘을 누르세요.
            </p>
          )}
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
