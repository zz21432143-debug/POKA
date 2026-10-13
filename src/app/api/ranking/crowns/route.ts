import { NextResponse } from "next/server";
import { awardLastWeekKingMark } from "@/lib/grant-reward-marks";
import { getCrownNicknames } from "@/lib/ranking";
import { getPotTitles } from "@/lib/pot-titles";

export async function GET() {
  await awardLastWeekKingMark().catch(() => undefined);
  const [nicknames, potTitles] = await Promise.all([getCrownNicknames().catch(() => []), getPotTitles().catch(() => ({}))]);
  return NextResponse.json({ nicknames, potTitles });
}
