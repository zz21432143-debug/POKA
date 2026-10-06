import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/current-user";
import { loginHref } from "@/lib/login-path";
import type { ReactNode } from "react";

export async function RequireLogin({ children, next }: { children: ReactNode; next?: string }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    const path = next ?? (await headers()).get("x-pathname") ?? "/";
    redirect(loginHref(path));
  }
  return children;
}
