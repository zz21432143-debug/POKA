import type { Metadata } from "next";
import { AccountPrivacyPanel } from "@/components/account/account-privacy-panel";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { replaceToLogin } from "@/lib/history-redirect";

export const metadata: Metadata = { title: "내 정보", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) replaceToLogin("/account");
  const links = await prisma.user
    .findUnique({ where: { id: user.id }, select: { kakaoId: true, googleId: true } })
    .catch(() => null);

  return (
    <article className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">내 정보</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          닉네임·이메일을 확인하고, 닉네임을 바꿀 수 있습니다. 탈퇴는 별도 화면입니다.
        </p>
      </header>
      <AccountPrivacyPanel
        nickname={user.nickname}
        email={user.email}
        changeCount={user.nicknameChangeCount}
        tickets={user.nicknameTickets}
      />
      <section className="rounded-xl border border-white/10 bg-[#151213] p-4 text-sm">
        <h2 className="font-semibold text-[#E5E7EB]">연결된 로그인</h2>
        <dl className="mt-2 grid grid-cols-[5rem_1fr] gap-y-1.5 text-[#cfd2d6]">
          <dt className="text-muted-foreground">카카오</dt>
          <dd className="break-all">{links?.kakaoId ? `연결됨 · 회원번호 ${links.kakaoId}` : "연결 안 됨"}</dd>
          <dt className="text-muted-foreground">구글</dt>
          <dd>{links?.googleId ? "연결됨" : "연결 안 됨"}</dd>
        </dl>
      </section>
    </article>
  );
}
