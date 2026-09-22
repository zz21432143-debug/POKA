import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    redirect("/");
  }
  redirect(`/u/${encodeURIComponent(user.nickname)}`);
}
