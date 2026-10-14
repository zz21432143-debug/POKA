import { NextResponse } from "next/server";
import { BUILD_ID } from "@/lib/build-id";

export const dynamic = "force-dynamic";

/** 지금 배포 번호. 오래 켜 둔 화면(설치 앱 등)이 새 배포를 알아채고 새로고침하는 데 씁니다. */
export function GET() {
  return NextResponse.json({ build: BUILD_ID }, { headers: { "Cache-Control": "no-store" } });
}
