/**
 * 딜러 툴(로테이션·싯드로우) 공개 여부.
 * 완성 전까지는 POKA 마스터 계정만 들어갈 수 있습니다. 공개할 때 true로 바꾸면 로그인 회원 모두 씁니다.
 */
export const DEALER_TOOLS_OPEN = false;

export function canUseDealerTools(user: { isMaster?: boolean } | null | undefined) {
  if (!user) return false;
  return Boolean(user.isMaster) || DEALER_TOOLS_OPEN;
}
