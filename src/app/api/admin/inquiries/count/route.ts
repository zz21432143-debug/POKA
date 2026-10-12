import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { unseenInquiryCount } from "@/lib/inquiry-alerts";

export const dynamic = "force-dynamic";

/** 관리자용: 아직 확인 안 한 광고 문의 수. 관리자가 아니면 0. */
export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !isStaff(user)) return NextResponse.json({ count: 0 });
  const count = await unseenInquiryCount().catch(() => 0);
  return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
}
