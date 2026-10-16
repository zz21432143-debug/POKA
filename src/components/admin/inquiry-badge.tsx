"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/link";

/** 관리자용: 확인 안 한 광고 문의가 있으면 "새 문의 N" 버튼을 보여줍니다. */
export function InquiryBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/inquiries/count", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ count?: number }>)
      .then((data) => {
        if (alive) setCount(data.count ?? 0);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (count <= 0) return null;
  return (
    <Link
      href="/admin/inquiries"
      className="touch-target flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#8B2222] text-sm font-bold text-white hover:bg-[#a12a2a]"
    >
      새 광고 문의
      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-[#8B2222]">{count > 99 ? "99+" : count}</span>
    </Link>
  );
}
