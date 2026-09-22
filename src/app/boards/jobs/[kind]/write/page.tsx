import { redirect } from "next/navigation";
import { resolveJobKind } from "@/lib/nav";

export default async function LegacyJobWritePage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const job = resolveJobKind(kind);
  if (job?.kind === "APPLY") redirect("/boards/pickup/write");
  if (job?.kind === "TEAM") redirect("/boards/talent/write");
  redirect("/boards/hire/write");
}
