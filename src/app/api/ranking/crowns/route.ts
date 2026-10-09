import { NextResponse } from "next/server";
import { awardLastWeekKingMark } from "@/lib/grant-reward-marks";
import { getCrownNicknames } from "@/lib/ranking";

export async function GET() {
  await awardLastWeekKingMark().catch(() => undefined);
  const nicknames = await getCrownNicknames().catch(() => []);
  return NextResponse.json({ nicknames });
}
