export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureDb } = await import("@/lib/ensure-db");
  await ensureDb();
}
