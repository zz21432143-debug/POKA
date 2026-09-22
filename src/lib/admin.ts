import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return {
      user: null,
      error: NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 403 }),
    };
  }
  return { user, error: null };
}
