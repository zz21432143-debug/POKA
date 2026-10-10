import type { Metadata } from "next";
import Link from "next/link";
import { SidePotDrill } from "@/components/practice/side-pot-drill";

export const metadata: Metadata = {
  title: "사이드팟 계산",
  description: "올인 스택으로 메인팟·사이드팟을 10문제 연습합니다.",
};

export default function SidePotPracticePage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        <Link href="/practice" className="text-muted-foreground hover:text-foreground">
          딜러 연습
        </Link>
        <span className="mx-1 text-muted-foreground">/</span>
        사이드팟 계산
      </p>
      <SidePotDrill />
    </div>
  );
}
