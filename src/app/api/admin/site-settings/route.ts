import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMaster } from "@/lib/admin";
import {
  SITE_SETTING_ID,
  clearSiteSettingsCache,
  ensureSiteSettingsRow,
} from "@/lib/site-settings";

export async function GET() {
  const { error } = await requireMaster();
  if (error) return error;
  await ensureSiteSettingsRow();
  const settings = await prisma.siteSetting.findUnique({ where: { id: SITE_SETTING_ID } });
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const { error } = await requireMaster();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as {
    noticeBanner?: string | null;
    footerEmail?: string;
    kakaoChannelUrl?: string | null;
  };
  const footerEmail = (body.footerEmail ?? "").trim();
  if (footerEmail && !footerEmail.includes("@")) {
    return NextResponse.json({ error: "문의 이메일을 확인하세요." }, { status: 400 });
  }
  await ensureSiteSettingsRow();
  const settings = await prisma.siteSetting.update({
    where: { id: SITE_SETTING_ID },
    data: {
      noticeBanner: typeof body.noticeBanner === "string" ? body.noticeBanner.trim() || null : undefined,
      footerEmail: footerEmail || undefined,
      kakaoChannelUrl:
        typeof body.kakaoChannelUrl === "string" ? body.kakaoChannelUrl.trim() || null : undefined,
    },
  });
  clearSiteSettingsCache();
  return NextResponse.json({ ok: true, settings });
}
