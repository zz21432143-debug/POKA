import { NextResponse } from "next/server";
import { issueCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  const challenge = issueCaptcha();
  return NextResponse.json({ token: challenge.token, prompt: challenge.prompt });
}
