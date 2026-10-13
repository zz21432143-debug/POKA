import { NextResponse } from "next/server";
import { awardLastWeekKingMark } from "@/lib/grant-reward-marks";
import { getCrownNicknames } from "@/lib/ranking";
import { getPotTitleInfo } from "@/lib/pot-titles";

export async function GET() {
  await awardLastWeekKingMark().catch(() => undefined);
  const [nicknames, potTitle] = await Promise.all([getCrownNicknames().catch(() => []), getPotTitleInfo().catch(() => null)]);
  return NextResponse.json({ nicknames, potTitle });
}
