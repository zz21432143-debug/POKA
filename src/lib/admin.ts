import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) {
    return {
      user: null,
      error: NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 }),
    };
  }
  return { user, error: null };
}

export async function requireMaster() {
  const user = await getCurrentUser();
  if (!user?.isMaster) {
    return {
      user: null,
      error: NextResponse.json({ error: "마스터 계정만 인증을 달 수 있습니다." }, { status: 403 }),
    };
  }
  return { user, error: null };
}
