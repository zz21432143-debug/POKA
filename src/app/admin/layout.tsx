import type { ReactNode } from "react";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { AdFillAlert } from "@/components/admin/ad-fill-alert";

/** 모든 관리자 화면 위: 하는 일별로 묶은 메뉴(관리자 · 마스터만) */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !isStaff(user)) return <>{children}</>;
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={null}>
        <AdminNav isMaster={Boolean(user.isMaster)} />
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
