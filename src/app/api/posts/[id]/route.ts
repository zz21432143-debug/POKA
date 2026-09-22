import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { jobFieldsFromBody } from "@/lib/job-fields";
import type { JobKind } from "@/generated/prisma/enums";

const JOB_KINDS: JobKind[] = ["FIXED", "APPLY", "TEAM"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const { id } = await context.params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (post.authorId !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: "작성자만 수정할 수 있습니다." }, { status: 403 });
    }
    if (post.boardType !== "JOBS") {
      return NextResponse.json({ error: "이 글은 구인 수정만 지원합니다." }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown> & { jobKind?: JobKind; content?: string; isPaid?: boolean };
    const jobKind = (body.jobKind && JOB_KINDS.includes(body.jobKind) ? body.jobKind : post.jobKind) as JobKind | null;
    if (!jobKind) {
      return NextResponse.json({ error: "구인 종류를 확인하세요." }, { status: 400 });
    }
    const jobData = jobFieldsFromBody(body, jobKind);
    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: jobData.title,
        content: typeof body.content === "string" ? body.content : post.content,
        jobKind,
        ...jobData,
        isPaid: typeof body.isPaid === "boolean" ? body.isPaid : post.isPaid,
      },
    });
    return NextResponse.json({ id: updated.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "수정에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
