import { redirect } from "next/navigation";
import { resolveJobKind } from "@/lib/nav";

export default async function LegacyJobBoardPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const job = resolveJobKind(kind);
  if (job?.kind === "APPLY") redirect("/boards/pickup");
  if (job?.kind === "TEAM") redirect("/boards/talent");
  redirect("/boards/hire");
}
