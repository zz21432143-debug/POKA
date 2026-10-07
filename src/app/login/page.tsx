import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; verify?: string; email?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  const { next, verify, email } = await searchParams;
  const nextPath = next?.startsWith("/") ? next : "/";
  if (user) redirect(nextPath);

  return (
    <article className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-semibold">로그인</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        로그인은 닉네임과 비밀번호만 있으면 됩니다. 이메일 인증은 회원가입할 때만 필요합니다. 가입은
        만 19세 이상만 할 수 있습니다.
      </p>
      <div className="mt-5">
        <AuthForm nextPath={nextPath} initialEmail={email ?? ""} initialVerifyFail={verify === "fail"} />
      </div>
    </article>
  );
}
