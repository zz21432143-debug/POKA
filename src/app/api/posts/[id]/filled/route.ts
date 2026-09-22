import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { JOB_KIND_LABEL } from "@/lib/nav";
import { pushTicker } from "@/lib/ticker";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const { id } = await context.params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: { author: { select: { nickname: true } } },
    });
    if (!post || post.boardType !== "JOBS") {
      return NextResponse.json({ error: "구인 글이 아닙니다." }, { status: 404 });
    }
    if (post.authorId !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: "작성자만 채용 완료할 수 있습니다." }, { status: 403 });
    }
    await prisma.post.update({ where: { id }, data: { jobFilled: true } });
    const shop = post.jobLocation || post.title;
    const kindLabel = post.jobKind
      ? JOB_KIND_LABEL[post.jobKind as keyof typeof JOB_KIND_LABEL]
      : "구인";
    await pushTicker({
      kind: `HIRE:${post.id}`,
      message: `🤝 [${shop}]에서 ${kindLabel.replace("구인", "").trim() || "팀원"} 채용을 완료하셨습니다!`,
      href: `/posts/${post.id}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "처리에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
