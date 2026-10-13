import { redirect, RedirectType } from "next/navigation";
import { loginHref } from "@/lib/login-path";
import { isInternalPath } from "@/lib/oauth-consent";

export function replaceTo(path: string): never {
  // 사이트 안 경로만 허용합니다. "//host" 나 "/\host" 는 다른 사이트로 나가므로 막습니다.
  redirect(isInternalPath(path) ? path : "/", RedirectType.replace);
}

export function replaceToLogin(next = "/"): never {
  redirect(loginHref(next), RedirectType.replace);
}
