import { redirect } from "next/navigation";
import { AccountPrivacyPanel } from "@/components/account/account-privacy-panel";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/account");

  return (
    <article className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">내 정보·탈퇴</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          개인정보 열람과 회원 탈퇴를 여기서 할 수 있습니다.
        </p>
      </header>
      <AccountPrivacyPanel nickname={user.nickname} email={user.email} />
    </article>
  );
}
