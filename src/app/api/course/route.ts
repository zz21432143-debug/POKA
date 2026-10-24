import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { grantRewards } from "@/lib/exp";
import { publicErrorMessage } from "@/lib/public-error";
import { COURSE_POINTS, isCourseStep, newlyCompleted } from "@/lib/courses";

type Progress = { read: string[]; done: string[] };
const rowId = (userId: string) => `course-${userId}`;

async function load(userId: string): Promise<Progress> {
  const row = await prisma.toolSaved.findUnique({ where: { id: rowId(userId) }, select: { dataJson: true } }).catch(() => null);
  try {
    const data = row ? (JSON.parse(row.dataJson) as Partial<Progress>) : {};
    return { read: Array.isArray(data.read) ? data.read : [], done: Array.isArray(data.done) ? data.done : [] };
  } catch {
    return { read: [], done: [] };
  }
}

/** 내 코스 진도(읽은 글 · 끝낸 코스). 비회원은 401 → 화면이 이 기기 기록을 씀 */
export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  return NextResponse.json(await load(user.id));
}

/** 글 읽음 { key: "holdem:position" } · 코스를 다 읽으면 그 코스 한 번 +COURSE_POINTS */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as { key?: unknown };
    const key = typeof body.key === "string" ? body.key : "";
    if (!isCourseStep(key)) return NextResponse.json({ error: "코스 글이 아니에요." }, { status: 400 });
    const progress = await load(user.id);
    const read = new Set(progress.read);
    if (read.has(key)) return NextResponse.json({ ...progress, completed: [], points: 0 });
    read.add(key);
    const done = new Set(progress.done);
    const completed = newlyCompleted(read, done);
    for (const id of completed) done.add(id);
    const data: Progress = { read: [...read], done: [...done] };
    await prisma.toolSaved.upsert({
      where: { id: rowId(user.id) },
      create: { id: rowId(user.id), ownerId: user.id, kind: "course-progress", name: "공부 코스", dataJson: JSON.stringify(data) },
      update: { dataJson: JSON.stringify(data) },
    });
    let points = 0;
    if (completed.length) {
      const reward = await grantRewards(user.id, 20 * completed.length, COURSE_POINTS * completed.length, { ignorePointCap: true });
      points = reward.grantedPoints;
    }
    return NextResponse.json({ ...data, completed, points });
  } catch (error) {
    return NextResponse.json({ error: publicErrorMessage(error, "진도 저장에 실패했습니다.") }, { status: 500 });
  }
}
