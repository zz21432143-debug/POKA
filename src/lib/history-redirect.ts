import { redirect, RedirectType } from "next/navigation";
import { loginHref } from "@/lib/login-path";

export function replaceTo(path: string) {
  redirect(path.startsWith("/") ? path : "/", RedirectType.replace);
}

export function replaceToLogin(next = "/") {
  redirect(loginHref(next), RedirectType.replace);
}
