import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import type { ReactNode } from "react";

export async function RequireLogin({ children }: { children: ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login");
  return children;
}
