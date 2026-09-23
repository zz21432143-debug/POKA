import type { Metadata } from "next";
import Link from "next/link";
import { getDealerCrew } from "@/lib/growth-ops";
import { MarkImage } from "@/components/layout/mark-image";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "인증 딜러 운영팀 — POKA",
  description: "홀덤 인증 딜러 10명. 골드 뱃지는 주 1회 핸드리뷰 또는 현장 스케치로 유지합니다.",
};

export default async function DealersPage() {
  const dealers = await getDealerCrew().catch(() => []);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">인증 딜러</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          골드 뱃지는 가입 선물이 아닙니다. 이번 주(월–일, KST) 안에 핸드리뷰 또는 현장 스케치를 1편
          이상 올리면 유지로 표시됩니다. 홀덤만 인정합니다.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {dealers.map((dealer) => (
          <li key={dealer.id}>
            <Link
              href={`/u/${encodeURIComponent(dealer.nickname)}`}
              className="touch-target flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm hover:border-primary/40"
            >
              <MarkImage src={dealer.profileMarkImageUrl} alt="" size={40} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{dealer.nickname}</span>
                <span className="block text-sm text-muted-foreground">
                  Lv.{dealer.level}
                  {dealer.isDealerVerified ? " · 인증 딜러" : ""}
                </span>
              </span>
              <span
                className={
                  dealer.weeklyOk
                    ? "rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                    : "rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground"
                }
              >
                {dealer.weeklyOk ? `이번 주 ${dealer.weeklyOpsPosts}편` : "이번 주 0편"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
