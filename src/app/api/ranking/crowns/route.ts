import { NextResponse } from "next/server";
import { awardLastWeekKingMark } from "@/lib/grant-reward-marks";
import { getCrownNicknames } from "@/lib/ranking";
import { getHonorInfo, getPotTitleInfo } from "@/lib/pot-titles";

export async function GET() {
  await awardLastWeekKingMark().catch(() => undefined);
  const [nicknames, potTitle, honors] = await Promise.all([
    getCrownNicknames().catch(() => []),
    getPotTitleInfo().catch(() => null),
    getHonorInfo().catch(() => null),
  ]);
  return NextResponse.json({ nicknames, potTitle, honors });
}
