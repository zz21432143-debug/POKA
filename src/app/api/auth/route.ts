import { NextResponse } from "next/server";
import { clearSession } from "@/lib/current-user";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string };
    if (body.action === "logout") {
      await clearSession();
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: "로그인은 카카오 또는 구글로만 할 수 있습니다." },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "처리할 수 없습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
