import { YokaiCodex } from "@/components/codex/yokai-codex";
import { getCurrentUser } from "@/lib/current-user";
import { getMarkCatalog } from "@/lib/marks";
import type { MarkCatalog } from "@/lib/mark-categories";

export const dynamic = "force-dynamic";

export default async function CodexPage() {
  const user = await getCurrentUser().catch(() => null);
  let initial: MarkCatalog | null = null;
  try {
    initial = await getMarkCatalog(user?.id);
  } catch {
    initial = null;
  }
  return <YokaiCodex initial={initial} nickname={user?.nickname ?? "POKA"} />;
}
