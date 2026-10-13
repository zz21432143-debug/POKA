/**
 * 딜러 툴(로테이션·싯드로우·급여 계산기) 공개 여부.
 * true면 로그인한 회원 누구나 씁니다(로테이션은 계정마다 따로라 서로 안 보입니다). false면 마스터 계정만.
 */
export const DEALER_TOOLS_OPEN = true;

export function canUseDealerTools(user: { isMaster?: boolean } | null | undefined) {
  if (!user) return false;
  return Boolean(user.isMaster) || DEALER_TOOLS_OPEN;
}
