import { siteUrl } from "@/lib/site";

export async function sendMail(options: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim() || "POKA <noreply@pokerwiki.co.kr>";
  if (!key) {
    console.log("[mail:fallback]", options.to, options.subject, options.text);
    return { sent: false as const };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        text: options.text,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[mail:resend]", response.status, body);
      return { sent: false as const };
    }
    return { sent: true as const };
  } catch (error) {
    console.error("[mail:resend]", error);
    return { sent: false as const };
  }
}

function verifyBaseUrl() {
  if (process.env.NODE_ENV === "development") return "http://127.0.0.1:43123";
  return siteUrl();
}

export function verificationMail(email: string, token: string) {
  const url = `${verifyBaseUrl()}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  return {
    url,
    subject: "[POKA] 이메일 인증",
    text: `POKA 회원가입을 완료하려면 아래 링크를 열어 이메일을 인증하세요.\n\n${url}\n\n링크는 24시간 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시하세요.`,
  };
}

/** 메일이 실제로 나가지 않았으면 화면에서 링크·코드를 보여 준다. */
export function canRevealVerifyArtifacts(sent: boolean) {
  if (!sent) return true;
  return process.env.NODE_ENV !== "production";
}
