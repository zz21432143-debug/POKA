/**
 * 화면에 보여 줄 오류 문구. 우리가 직접 던진 한국어 안내는 그대로,
 * DB · 내부 오류(영문 메시지 · Prisma 등)는 숨기고 기본 문구를 씁니다.
 */
export function publicErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message ?? "";
  const internal = error.name.startsWith("Prisma") || /prisma|invalid `|database|ECONN|timeout|\bat \w/i.test(message) || !/[가-힣]/.test(message);
  if (internal) {
    console.error(error);
    return fallback;
  }
  return message.slice(0, 200);
}
