import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function AdminSanctionsPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();
  redirect("/admin?tab=sanctions");
}
