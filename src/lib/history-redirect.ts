import { redirect, RedirectType } from "next/navigation";
import { loginHref } from "@/lib/login-path";

export function replaceTo(path: string): never {
  redirect(path.startsWith("/") ? path : "/", RedirectType.replace);
}

export function replaceToLogin(next = "/"): never {
  redirect(loginHref(next), RedirectType.replace);
}
