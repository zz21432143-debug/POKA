import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") ? next : "/";
  if (user) redirect(nextPath);

  return (
    <article className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-semibold">로그인</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        카카오 또는 닉네임으로 들어오면 글·댓글·출석을 쓸 수 있습니다. 인증 딜러 뱃지는 운영자가 부여합니다.
      </p>
      <div className="mt-5">
        <AuthForm nextPath={nextPath} />
      </div>
    </article>
  );
}
