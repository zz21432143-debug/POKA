import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getYokai } from "@/lib/yokai-server";
import { YokaiVillage } from "@/components/yokai/yokai-village";

export const metadata: Metadata = { title: "요괴 마을", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** 요괴 마을(개발 중): 마스터 계정에만 보임. 다른 사람에게는 없는 주소(404) */
export default async function YokaiPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user?.isMaster) notFound();
  const yokai = await getYokai(user.id);
  return <YokaiVillage initial={yokai} />;
}
