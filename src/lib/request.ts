export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "127.0.0.1";
  return request.headers.get("x-real-ip") ?? "127.0.0.1";
}

export function isAnonymousBoard(boardType: string): boolean {
  return boardType === "ANONYMOUS_REVIEW";
}
