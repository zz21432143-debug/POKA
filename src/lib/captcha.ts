import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const TTL_MS = 10 * 60 * 1000;
const MIN_SOLVE_MS = 1_200;

function secret() {
  return process.env.SESSION_SECRET?.trim() || process.env.DATABASE_URL?.trim() || "poka-dev-session-secret";
}

export type CaptchaChallenge = {
  token: string;
  prompt: string;
  a: number;
  b: number;
};

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueCaptcha(now = Date.now()): CaptchaChallenge {
  const a = randomInt(2, 12);
  const b = randomInt(2, 12);
  const payload = `${a}.${b}.${now}`;
  return {
    token: `${payload}.${sign(payload)}`,
    prompt: `${a} + ${b} = ?`,
    a,
    b,
  };
}

export function verifyCaptcha(token: string | undefined, answer: unknown, now = Date.now()): string | null {
  if (!token || typeof token !== "string") return "봇 확인 문제를 풀어 주세요.";
  const parts = token.split(".");
  if (parts.length !== 4) return "봇 확인이 만료되었습니다. 다시 받아 주세요.";
  const [aRaw, bRaw, issuedRaw, sig] = parts;
  const payload = `${aRaw}.${bRaw}.${issuedRaw}`;
  const expected = sign(payload);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return "봇 확인이 올바르지 않습니다.";
  }
  const a = Number(aRaw);
  const b = Number(bRaw);
  const issued = Number(issuedRaw);
  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isFinite(issued)) {
    return "봇 확인이 올바르지 않습니다.";
  }
  if (now - issued < MIN_SOLVE_MS) return "너무 빨리 제출했습니다. 문제를 확인하고 다시 시도하세요.";
  if (now - issued > TTL_MS) return "봇 확인이 만료되었습니다. 다시 받아 주세요.";
  const n = typeof answer === "number" ? answer : Number(String(answer ?? "").trim());
  if (!Number.isInteger(n) || n !== a + b) return "봇 확인 답이 맞지 않습니다.";
  return null;
}
