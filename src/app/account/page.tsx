import { AccountPrivacyPanel } from "@/components/account/account-privacy-panel";
import { getCurrentUser } from "@/lib/current-user";
import { replaceToLogin } from "@/lib/history-redirect";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) replaceToLogin("/account");

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
    </article>
  );
}
