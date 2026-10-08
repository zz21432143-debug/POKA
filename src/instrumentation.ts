export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureDb } = await import("@/lib/ensure-db");
  // Neon Free는 잠든 뒤 첫 연결이 깁니다. 요청을 여기서 막지 않고 뒤에서 깨웁니다.
  void ensureDb();
  void import("@/lib/db")
    .then(({ prisma }) => prisma.$queryRawUnsafe("SELECT 1"))
    .catch(() => undefined);
}
