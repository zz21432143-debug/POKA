const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export function emailError(raw: string): string | null {
  const email = normalizeEmail(raw);
  if (!email) return "이메일을 입력하세요.";
  if (email.length > 120) return "이메일이 너무 깁니다.";
  if (!EMAIL_RE.test(email)) return "이메일 형식을 확인하세요.";
  return null;
}
