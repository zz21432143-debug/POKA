import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canBumpNow, nextBumpAt } from "@/lib/job-bump";
import { jobStatus } from "@/lib/job-status";
import { isStaff } from "@/lib/roles";
import { publicErrorMessage } from "@/lib/public-error";

/** 모집중인 구인 공고를 목록 맨 위(프리미엄 다음)로 끌어올립니다. 작성자는 하루 한 번. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const { id } = await context.params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.boardType !== "JOBS" || post.hidden) {
      return NextResponse.json({ error: "구인 공고가 아닙니다." }, { status: 404 });
    }
    const staff = isStaff(user);
    if (post.authorId !== user.id && !staff) {
      return NextResponse.json({ error: "작성자만 끌어올릴 수 있습니다." }, { status: 403 });
    }
    if (jobStatus(post) !== "open") {
      return NextResponse.json({ error: "마감된 공고는 끌어올릴 수 없습니다." }, { status: 400 });
    }
    if (!staff && !canBumpNow(post.bumpedAt)) {
      return NextResponse.json(
        { error: "끌어올리기는 하루에 한 번만 할 수 있습니다.", nextAt: nextBumpAt(post.bumpedAt).toISOString() },
        { status: 429 },
      );
    }
    const updated = await prisma.post.update({ where: { id }, data: { bumpedAt: new Date() } });
    after(async () => {
      const { notifySlotWatchers } = await import("@/lib/job-board");
      await notifySlotWatchers(id).catch(() => undefined);
    });
    return NextResponse.json({ ok: true, bumpedAt: updated.bumpedAt.toISOString() });
  } catch (error) {
    const message = publicErrorMessage(error, "처리에 실패했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
