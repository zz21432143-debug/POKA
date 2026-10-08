export const NICKNAME_TICKET_PRICE = 500;
export const NICKNAME_TICKET_NAME = "닉네임 변경권";

export function canUseFreeNicknameChange(changeCount: number) {
  return changeCount <= 0;
}

export function nicknameChangeBlocked(changeCount: number, tickets: number) {
  if (canUseFreeNicknameChange(changeCount)) return null;
  if (tickets > 0) return null;
  return `추가 변경은 ${NICKNAME_TICKET_NAME}이 필요합니다. 상점에서 ${NICKNAME_TICKET_PRICE.toLocaleString()}P로 구매하세요.`;
}
