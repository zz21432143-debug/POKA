import type { ReactNode } from "react";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { AdFillAlert } from "@/components/admin/ad-fill-alert";
import { prisma } from "@/lib/db";

/** 모든 관리자 화면 위: 하는 일별로 묶은 메뉴(관리자 · 마스터만) */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !isStaff(user)) return <>{children}</>;
  // 메뉴 옆 숫자: 남은 환불 요청
  const pendingRefunds = user.isMaster
    ? await prisma.auditLog.count({ where: { kind: "refund-request", detail: { contains: '"status":"pending"' } } }).catch(() => 0)
    : 0;
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={null}>
        <AdminNav isMaster={Boolean(user.isMaster)} badges={{ "/admin/points": pendingRefunds }} />
      </Suspense>
      {user.isMaster ? (
        <Suspense fallback={null}>
          <AdFillAlert />
        </Suspense>
      ) : null}
      {children}
    </div>
  );
}
