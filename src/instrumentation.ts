export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // 로컬 테스트용 DB(prisma dev)는 연결을 하나만 받아서, 부팅 점검이 따로 연결하면 DB가 멈춥니다.
  // 그럴 때만 POKA_SKIP_BOOT_CHECK=1 로 끕니다. 운영(Vercel)에서는 설정하지 않습니다.
  if (process.env.POKA_SKIP_BOOT_CHECK === "1") return;
  const { ensureDb } = await import("@/lib/ensure-db");
  // Neon Free는 잠든 뒤 첫 연결이 깁니다. 요청을 여기서 막지 않고 뒤에서 깨웁니다.
  void ensureDb();
  void import("@/lib/db")
    .then(({ prisma }) => prisma.$queryRawUnsafe("SELECT 1"))
    .catch(() => undefined);
}

/** 서버에서 처리 못 한 오류: 기록하고 관리자에게 알림(/admin/errors) */
export async function onRequestError(error: unknown, request: { path: string; method: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { recordServerError } = await import("@/lib/error-watch");
  await recordServerError(error, request.path, request.method);
}
