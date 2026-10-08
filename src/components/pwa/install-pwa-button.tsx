"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, ShareIcon, PlusSquareIcon } from "lucide-react";
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

export function InstallPwaButton({ compact = false }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosOpen, setIosOpen] = useState(false);
  const [androidOpen, setAndroidOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
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
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

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
    setAndroidOpen(true);
  }

  const label = compact ? "앱 설치" : "홈 화면에 추가";

  return (
    <>
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
