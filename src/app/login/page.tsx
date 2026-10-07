import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const LOGIN_ERRORS: Record<string, string> = {
  consent: "소셜 로그인 전에 만 19세 확인, 이용약관, 개인정보 수집·이용에 모두 동의해 주세요.",
  kakao: "카카오 로그인에 실패했습니다. 다시 시도해 주세요.",
  google: "구글 로그인에 실패했습니다. 다시 시도해 주세요.",
  kakao_not_configured: "카카오 로그인이 아직 설정되지 않았습니다. 운영자에게 문의하세요.",
  google_not_configured: "구글 로그인이 아직 설정되지 않았습니다. 운영자에게 문의하세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  const { next, error } = await searchParams;
  const nextPath = next?.startsWith("/") ? next : "/";
  if (user) redirect(nextPath);
  const errorMessage = error ? (LOGIN_ERRORS[error] ?? "로그인에 실패했습니다. 다시 시도해 주세요.") : null;

  return (
    <article className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-semibold">시작하기</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        카카오 또는 구글 계정으로만 가입·로그인할 수 있습니다. 만 19세 이상만 이용할 수 있으며, 필수 동의에
        모두 체크한 뒤에 소셜 로그인을 진행하세요.
      </p>
      {errorMessage ? <p className="mt-3 text-sm text-destructive">{errorMessage}</p> : null}
      <div className="mt-5">
        <AuthForm nextPath={nextPath} />
      </div>
    </article>
  );
}
