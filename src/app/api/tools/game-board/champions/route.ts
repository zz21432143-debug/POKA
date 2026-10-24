import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { todayKstDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** 이달의 챔피언 기록(내 계정 · 상금 없음): 현황판에서 우승 이미지를 저장하면 한 줄 남김 */
const KIND = "board-champion";
type Row = { name: string; event: string; day: string; entries: number };

async function owner() {
  const user = await getCurrentUser().catch(() => null);
  return user && canUseDealerTools(user) ? user.id : null;
}

/** 이번 달(또는 ?month=YYYY-MM) 우승 기록 */
export async function GET(request: Request) {
  const ownerId = await owner();
  if (!ownerId) return NextResponse.json({ error: "로그인하면 쓸 수 있습니다." }, { status: 403 });
  const param = new URL(request.url).searchParams.get("month");
  const month = param && /^\d{4}-\d{2}$/.test(param) ? param : todayKstDate().slice(0, 7);
  const rows = await prisma.toolSaved.findMany({ where: { ownerId, kind: KIND, name: { startsWith: month } }, orderBy: { createdAt: "asc" }, take: 200, select: { id: true, dataJson: true } });
  const list = rows.map((r) => {
    try {
      return { id: r.id, ...(JSON.parse(r.dataJson) as Row) };
    } catch {
      return null;
    }
  }).filter(Boolean);
  return NextResponse.json({ month, list }, { headers: { "Cache-Control": "no-store" } });
}

/** 기록 남기기 { name, event, entries } · 같은 날 같은 대회 · 같은 우승자는 한 번만 */
export async function POST(request: Request) {
  const ownerId = await owner();
  if (!ownerId) return NextResponse.json({ error: "로그인하면 쓸 수 있습니다." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as Partial<Row>;
  const name = String(body.name ?? "").trim().slice(0, 16);
  const event = String(body.event ?? "").trim().slice(0, 30);
  const entries = Math.max(0, Math.min(10_000, Math.floor(Number(body.entries) || 0)));
  if (!name) return NextResponse.json({ error: "우승자 이름이 없어요." }, { status: 400 });
  const day = todayKstDate();
  const key = `${day}|${event}|${name}`;
  const id = `champ_${ownerId}_${Buffer.from(key).toString("base64url").slice(0, 60)}`;
  await prisma.toolSaved.upsert({
    where: { id },
    create: { id, ownerId, kind: KIND, name: `${day} ${event}`.slice(0, 60), dataJson: JSON.stringify({ name, event, day, entries }) },
    update: { dataJson: JSON.stringify({ name, event, day, entries }) },
  });
  return NextResponse.json({ ok: true });
}

/** 기록 지우기 ?id= */
export async function DELETE(request: Request) {
  const ownerId = await owner();
  if (!ownerId) return NextResponse.json({ error: "로그인하면 쓸 수 있습니다." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  await prisma.toolSaved.deleteMany({ where: { id, ownerId, kind: KIND } });
  return NextResponse.json({ ok: true });
}
