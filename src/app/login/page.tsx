import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import { cn } from "cn";

export const dynamic = "force-dynamic";

const LOGIN_ERRORS: Record<string, string> = {
  consent: "만 19세 확인, 이용약관, 개인정보 수집·이용에 모두 동의한 뒤 카카오 또는 구글로 시작해 주세요.",
  need_signup: "아직 가입되지 않은 계정입니다. 회원가입 탭에서 동의 후 가입해 주세요.",
  restricted: "이용이 제한된 계정입니다.",
  kakao: "카카오 로그인에 실패했습니다. 다시 시도해 주세요.",
  google: "구글 로그인에 실패했습니다. 다시 시도해 주세요.",
  kakao_not_configured: "카카오 로그인이 아직 설정되지 않았습니다. 운영자에게 문의하세요.",
  google_not_configured: "구글 로그인이 아직 설정되지 않았습니다. 운영자에게 문의하세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; tab?: string; msg?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  const { next, error, tab, msg } = await searchParams;
  const nextPath = next?.startsWith("/") ? next : "/";
  if (user) redirect(nextPath);
  const signup = tab === "signup";
  const errorMessage = msg?.trim()
    ? msg
    : error
      ? (LOGIN_ERRORS[error] ?? "로그인에 실패했습니다. 다시 시도해 주세요.")
      : null;
  const nextQuery = nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : "";

  return (
    <article className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        <Link
          href={`/login?tab=login${nextQuery}`}
          className={cn(
            "flex min-h-11 items-center justify-center rounded-full text-sm font-semibold",
            !signup ? "bg-white text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          로그인
        </Link>
        <Link
          href={`/login?tab=signup${nextQuery}`}
          className={cn(
            "flex min-h-11 items-center justify-center rounded-full text-sm font-semibold",
            signup ? "bg-white text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          회원가입
        </Link>
      </div>
      <h1 className="mt-5 text-2xl font-semibold">{signup ? "회원가입" : "로그인"}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {signup
          ? "만 19세 이상만 가입할 수 있습니다. 카카오 또는 구글로만 가입하며, 아래 필수 동의 3개를 모두 체크해야 진행됩니다."
          : "카카오 또는 구글로만 로그인합니다. 필수 동의 3개를 체크한 뒤 시작해 주세요. 처음이라면 회원가입 탭을 누르세요."}
      </p>
      {errorMessage ? <p className="mt-3 text-sm text-destructive">{errorMessage}</p> : null}
      <div className="mt-5">
        <AuthForm nextPath={nextPath} mode={signup ? "signup" : "login"} />
      </div>
    </article>
  );
}
