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
  // 모두에게 같은 내용: Vercel이 1분 저장(그동안은 서버 계산 없이 바로) · 5분까지는 옛것을 주며 새로 계산
  return NextResponse.json(
    { nicknames, potTitle, honors, yokai },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
