import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const KAKAO_ERRORS: Record<string, string> = {
  kakao: "카카오 로그인이 취소되었거나 앱 설정이 아직 끝나지 않았습니다.",
  kakao_not_configured: "카카오 REST API 키가 없습니다. Vercel 환경 변수에 KAKAO_REST_API_KEY를 넣으세요.",
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

  return (
    <article className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-semibold">로그인</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        목록은 로그인 없이 볼 수 있습니다. 글 본문·댓글·작성은 회원만 가능합니다.
      </p>
      {error && KAKAO_ERRORS[error] ? (
        <p className="mt-3 text-sm text-destructive">{KAKAO_ERRORS[error]}</p>
      ) : null}
      <div className="mt-5">
        <AuthForm nextPath={nextPath} />
      </div>
    </article>
  );
}
