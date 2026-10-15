import { NextResponse } from "next/server";
import { awardLastWeekKingMark } from "@/lib/grant-reward-marks";
import { getCrownNicknames } from "@/lib/ranking";
import { getHonorInfo, getPotTitleInfo } from "@/lib/pot-titles";
import { getYokaiReps } from "@/lib/yokai-server";

export async function GET() {
  await awardLastWeekKingMark().catch(() => undefined);
  const [nicknames, potTitle, honors] = await Promise.all([
    getCrownNicknames().catch(() => []),
    getPotTitleInfo().catch(() => null),
    getHonorInfo().catch(() => null),
  ]);
  // 대표 요괴(요괴 마을 공개 후에만 채워짐)
  const yokai = await getYokaiReps().catch(() => ({}));
  return NextResponse.json({ nicknames, potTitle, honors, yokai });
}
