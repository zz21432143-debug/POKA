import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { SITE_SETTING_ID } from "@/lib/site-settings";
import { markInquiriesSeen } from "@/lib/inquiry-alerts";
import { AdminAlertToggle } from "@/components/admin/admin-alert-toggle";

export const metadata: Metadata = { title: "광고 문의", robots: { index: false } };

export const dynamic = "force-dynamic";

type Inquiry = { nickname?: string; company?: string; contact?: string; product?: string; message?: string };

function parse(detail: string | null): Inquiry {
  try {
    return detail ? (JSON.parse(detail) as Inquiry) : {};
  } catch {
    return { message: detail ?? "" };
  }
}

function formatKst(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

/** /advertise 문의 양식으로 들어온 광고 문의 목록(최신 100건). */
export default async function AdminInquiriesPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();
  const [rows, seen] = await Promise.all([
    prisma.auditLog.findMany({
      where: { kind: "AD_INQUIRY" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.siteSetting.findUnique({ where: { id: SITE_SETTING_ID }, select: { inquirySeenAt: true } }),
  ]);
  // 목록을 열었으니 모두 읽음으로(이번 화면에서는 새 문의 표시를 남겨 둡니다)
  await markInquiriesSeen().catch(() => undefined);
  const seenAt = seen?.inquirySeenAt ?? null;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">광고 문의</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          광고 · 제휴 문의 페이지에서 들어온 문의입니다. 연락처로 직접 회신해 주세요.
        </p>
        <Link href="/admin" className="inline-flex min-h-11 items-center text-sm text-primary">
          관리자 페이지
        </Link>
        <AdminAlertToggle />
      </header>
      {rows.length === 0 ? (
        <p className="ink-panel rounded-2xl px-4 py-10 text-center text-sm text-[#D1D5DB]">아직 들어온 문의가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const inquiry = parse(row.detail);
            return (
              <li key={row.id} className="ink-panel rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {!seenAt || row.createdAt > seenAt ? (
                    <span className="rounded-full bg-[#8B2222] px-2 py-0.5 text-xs font-bold text-white">새 문의</span>
                  ) : null}
                  <p className="text-base font-bold text-white">{inquiry.company || "(업체명 없음)"}</p>
                  {inquiry.product ? (
                    <span className="rounded-full bg-[#2a2017] px-2 py-0.5 text-xs font-semibold text-[#e7c98a]">
                      {inquiry.product}
                    </span>
                  ) : null}
                  <span className="ml-auto text-xs text-[#9CA3AF]">{formatKst(row.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-emerald-300">연락처: {inquiry.contact || "-"}</p>
                {inquiry.nickname ? (
                  <p className="mt-0.5 text-xs text-[#c9c0b2]">
                    보낸 회원:{" "}
                    <Link href={`/u/${encodeURIComponent(inquiry.nickname)}`} className="font-semibold text-[#e7c98a] underline">
                      {inquiry.nickname}
                    </Link>
                  </p>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#D1D5DB]">
                  {inquiry.message || "(내용 없음)"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
