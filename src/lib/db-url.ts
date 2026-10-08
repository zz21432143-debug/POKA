/** Neon 직접 연결은 서버리스에서 쉽게 막힙니다. pooler 호스트로 바꿉니다. */
export function preferNeonPooler(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (!host.endsWith(".neon.tech")) return url;
    if (host.includes("-pooler.")) return url;
    const labels = host.split(".");
    const head = labels[0];
    if (!head?.startsWith("ep-")) return url;
    labels[0] = `${head}-pooler`;
    parsed.hostname = labels.join(".");
    return parsed.toString();
  } catch {
    return url;
  }
}
