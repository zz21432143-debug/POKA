import { AccountWithdrawPanel } from "@/components/account/account-withdraw-panel";
import { getCurrentUser } from "@/lib/current-user";
import { replaceToLogin } from "@/lib/history-redirect";

export const dynamic = "force-dynamic";

export default async function AccountWithdrawPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) replaceToLogin("/account/withdraw");

  return (
    <article className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">회원 탈퇴</h1>
        <p className="mt-1 text-sm text-muted-foreground">내 정보에서 들어온 탈퇴 전용 화면입니다.</p>
      </header>
      <AccountWithdrawPanel nickname={user.nickname} />
    </article>
  );
}
