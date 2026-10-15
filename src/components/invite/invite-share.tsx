"use client";

import { useEffect, useState } from "react";

/** 초대 링크 복사 · 카톡/문자로 보내기 · QR(매장 · 대기실에 붙이기) */
export function InviteShare({
  link,
  nickname,
  gift,
}: {
  link: string;
  nickname: string;
  gift: number;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const text = `${nickname}님이 POKA에 초대했어요!\n홀덤 딜러 · 홀덤인 커뮤니티 — 급구 · 대타 알림, 무료 홀덤 도구, 오늘의 퀴즈, 요괴 키우기.\n가입하고 첫 출석하면 ${gift}P 선물 🎁`;

  useEffect(() => {
    let alive = true;
    void import("qrcode")
      .then((QR) =>
        QR.toDataURL(link, {
          width: 480,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [link]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text}\n${link}`);
      setNote("초대 글과 링크를 복사했어요. 단톡방에 붙여 넣으세요!");
    } catch {
      setNote("복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "POKA 초대", text, url: link });
        setNote("보냈어요!");
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    await copy();
  }

  return (
    <div data-invite-share className="grid gap-3">
      <p
        data-invite-link
        className="rounded-xl border border-[#c9a25c]/40 bg-black/40 px-3 py-2 text-sm font-bold break-all text-[#f3d9a4] select-all"
      >
        {link}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-invite-send
          onClick={() => void share()}
          className="min-h-11 rounded-xl bg-[#FEE500] px-3 text-sm font-black text-black"
        >
          📤 카톡 · 문자로 보내기
        </button>
        <button
          type="button"
          data-invite-copy
          onClick={() => void copy()}
          className="min-h-11 rounded-xl border border-[#c9a25c]/60 px-3 text-sm font-black text-[#f3d9a4]"
        >
          📋 링크 복사
        </button>
      </div>
      {note ? (
        <p role="status" className="text-sm font-bold text-emerald-300">
          {note}
        </p>
      ) : null}
      {qr ? (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 만든 QR */}
          <img
            src={qr}
            alt="내 초대 QR"
            data-invite-qr
            className="size-28 shrink-0 rounded-lg bg-white p-1"
          />
          <div className="grid gap-2 text-sm text-[#d1c7b5]">
            <p>
              옆 사람에게 보여 주거나 인쇄해서 매장 · 대기실에 붙여 두세요.{" "}
              <b className="text-white">폰 카메라로 찍기만 하면</b> 초대 링크가
              열려요.
            </p>
            <a
              href={qr}
              download="POKA_초대_QR.png"
              className="inline-flex min-h-10 w-fit items-center rounded-lg bg-white px-3 text-sm font-black text-black"
            >
              QR 저장
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
