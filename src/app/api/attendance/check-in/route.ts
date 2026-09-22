import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { checkInAttendance } from "@/lib/attendance";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const body = (await request.json()) as { content?: string };
    const result = await checkInAttendance(user.id, body.content ?? "");
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "출석에 실패했습니다.";
    const status = message.includes("이미 출석") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
