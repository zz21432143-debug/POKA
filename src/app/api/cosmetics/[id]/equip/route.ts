import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { equipCosmetic } from "@/lib/shop-actions";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const { id } = await context.params;
    const result = await equipCosmetic(user.id, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, kind: result.kind });
  } catch (error) {
    const message = error instanceof Error ? error.message : "착용에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
