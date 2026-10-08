import { getCurrentUser } from "@/lib/current-user";
import { replaceTo, replaceToLogin } from "@/lib/history-redirect";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) replaceToLogin("/me");
  replaceTo(`/u/${encodeURIComponent(user.nickname)}`);
}
