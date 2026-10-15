import { getCurrentUser } from "@/lib/current-user";
import { getMissions } from "@/lib/missions";
import { MissionCard } from "@/components/home/mission-card";

/** 홈: 오늘의 미션(로그인 회원만) */
export async function HomeMissions() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return null;
  const missions = await getMissions(user.id).catch(() => null);
  if (!missions) return null;
  return <MissionCard initial={missions} />;
}
