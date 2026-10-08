import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { replaceTo } from "@/lib/history-redirect";

export const dynamic = "force-dynamic";

export default async function AdminSanctionsPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();
  replaceTo("/admin?tab=sanctions");
}
