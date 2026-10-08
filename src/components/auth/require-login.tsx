import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/current-user";
import { replaceToLogin } from "@/lib/history-redirect";
import type { ReactNode } from "react";

export async function RequireLogin({ children, next }: { children: ReactNode; next?: string }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    const path = next ?? (await headers()).get("x-pathname") ?? "/";
    replaceToLogin(path);
  }
  return children;
}
