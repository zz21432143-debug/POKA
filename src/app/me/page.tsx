import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/current-user";
import { replaceTo, replaceToLogin } from "@/lib/history-redirect";

export const metadata: Metadata = { title: "마이페이지", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) replaceToLogin("/me");
  replaceTo(`/u/${encodeURIComponent(user.nickname)}`);
}
