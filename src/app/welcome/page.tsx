import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { NICKNAME_CHANGE_HREF, NICKNAME_TICKET_NAME } from "@/lib/nickname-change";
import { safeNextPath } from "@/lib/oauth-consent";

export const dynamic = "force-dynamic";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?tab=signup");
  const { next } = await searchParams;
  const later = safeNextPath(next);

  return (
    <article className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-emerald-800">POKA</p>
      <h1 className="mt-2 text-2xl font-semibold">가입을 축하드립니다</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {user.nickname}님, 홀덤·딜러 커뮤니티에 오신 것을 환영합니다. 지금 닉네임은 카카오 또는 구글에서 가져온
        이름입니다.
      </p>
      <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
        <h2 className="text-sm font-semibold text-emerald-950">{NICKNAME_TICKET_NAME} 최초 1회 지급</h2>
        <p className="mt-1.5 text-sm leading-6 text-emerald-950">
          가입하면 닉네임을 한 번 무료로 바꿀 수 있습니다. 사용처는 내 정보의 닉네임 변경 칸입니다. 그다음부터는
          상점에서 변경권을 사야 합니다.
        </p>
      </section>
      <div className="mt-5 grid gap-2">
        <Link
          href={NICKNAME_CHANGE_HREF}
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-primary px-4 text-base font-semibold text-primary-foreground"
        >
          닉네임 변경하러 가기
        </Link>
        <Link
          href={later}
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-border px-4 text-base font-medium hover:bg-muted"
        >
          나중에 하기
        </Link>
      </div>
    </article>
  );
}
