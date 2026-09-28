import type { Metadata } from "next";
import Link from "next/link";
import { MinRaiseDrill } from "@/components/practice/min-raise-drill";

export const metadata: Metadata = {
  title: "미니멈 레이즈 — POKA",
  description: "노리밋 홀덤 미니멈 레이즈 총액을 10문제 연습합니다.",
};

export default function MinRaisePracticePage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        <Link href="/practice" className="text-muted-foreground hover:text-foreground">
          딜러 연습
        </Link>
        <span className="mx-1 text-muted-foreground">/</span>
        미니멈 레이즈
      </p>
      <MinRaiseDrill />
    </div>
  );
}
