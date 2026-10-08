import { isSeedCatalogNickname } from "@/lib/purge-demo-catalog";

export type SwitchAccount = {
  nickname: string;
  level: number;
  isAdmin: boolean;
  isMaster: boolean;
  isDealerVerified: boolean;
  points: number;
};

/** 시드 닉네임(옛 레벨처럼 보이던 이름)은 계정 전환 목록에서 빼 둡니다. */
export function filterSwitchAccounts(accounts: SwitchAccount[]): SwitchAccount[] {
  return accounts.filter(
    (account) =>
      (account.isMaster || account.isAdmin) && !isSeedCatalogNickname(account.nickname),
  );
}
