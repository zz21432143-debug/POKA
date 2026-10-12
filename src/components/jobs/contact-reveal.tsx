"use client";

import { useState } from "react";
import Link from "next/link";
import { CopyIcon, MessageSquareIcon, PhoneIcon } from "lucide-react";

/** 연락처 글("김포카 010-1234-5678")에서 전화번호를 찾아 전화·문자 버튼에 씁니다. */
function phoneDigits(value: string) {
  const match = value.match(/(?:\+82[-\s.]?|0)(?:1\d|[2-6]\d?|70)[-\s.)]?\d{3,4}[-\s.]?\d{4}/);
  return match ? match[0].replace(/[^0-9+]/g, "") : null;
}

/**
 * 구인글 연락처. 로그인한 회원에게는 서버에서 바로 넣어 주어 누르지 않아도 보입니다.
 * 비회원에게는 번호를 내려보내지 않습니다.
 */
export function ContactReveal({
  hasContact,
  loggedIn,
  contact,
  loginHref = "/login",
}: {
  hasContact: boolean;
  loggedIn: boolean;
  /** 로그인한 회원에게만 채워지는 연락처 */
  contact: string | null;
  loginHref?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!hasContact) {
    return <p className="text-sm text-[#c9c0b2]">등록된 연락처가 없습니다.</p>;
  }

  if (!loggedIn || !contact) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-black/30 px-3 py-3 text-sm text-[#c9c0b2]">
        <span>연락처는 로그인한 회원에게만 보입니다.</span>
        <Link
          href={loginHref}
          className="touch-target ml-auto inline-flex min-h-11 items-center rounded-xl bg-[#8b2222] px-4 text-sm font-bold text-white hover:bg-[#a12a2a]"
        >
          로그인하고 보기
        </Link>
      </div>
    );
  }

  const tel = phoneDigits(contact);

  async function copy() {
    try {
      await navigator.clipboard.writeText(tel ?? contact ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // 복사를 막는 브라우저는 번호를 길게 눌러 복사하면 됩니다.
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="select-all break-all text-2xl font-black tracking-wide text-emerald-300 sm:text-[1.7rem]">{contact}</p>
      <div className="flex flex-wrap gap-2">
        {tel ? (
          <>
            <a
              href={`tel:${tel}`}
              className="touch-target inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white hover:bg-emerald-500 sm:flex-none"
            >
              <PhoneIcon className="size-5" />
              전화 걸기
            </a>
            <a
              href={`sms:${tel}`}
              className="touch-target inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-600 px-4 text-base font-bold text-emerald-300 hover:bg-emerald-600/15 sm:flex-none"
            >
              <MessageSquareIcon className="size-5" />
              문자
            </a>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => void copy()}
          className="touch-target inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-[#E5E7EB] hover:bg-white/10"
        >
          <CopyIcon className="size-4" />
          {copied ? "복사됨" : "번호 복사"}
        </button>
      </div>
    </div>
  );
}
